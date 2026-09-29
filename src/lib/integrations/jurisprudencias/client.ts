import "server-only";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { currentActorId } from "@/lib/auth/actor";
import { getReleaseInfo } from "@/lib/config/release";
import { NO_USAGE } from "@/lib/llm/types";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getIntegrationRepository } from "../getIntegrationRepository";
import type { JurisprudenciasCaller } from "./caller";
import { JURISPRUDENCIAS_MCP_URL, JURISPRUDENCIAS_PROVIDER, usageModelOf } from "./config";
import { callbackUrl } from "./connection";
import {
  JurisprudenciasCallError,
  JurisprudenciasLimitError,
  JurisprudenciasNotConnectedError,
  RECONNECT_MESSAGE,
  UNREADABLE_MESSAGE,
  isLimitMessage,
} from "./errors";
import { createJurisprudenciasAuthProvider } from "./oauthProvider";

/** Searches of a whole court can take a while; past this the assistant carries on without them. */
const CALL_TIMEOUT_MS = 60_000;
const CLIENT_NAME = "Magistral";

interface ToolContent {
  type: string;
  text?: string;
}

/** The text parts of a result; structured content only when there is no text. */
function resultText(result: Record<string, unknown>): string {
  const parts = Array.isArray(result.content) ? (result.content as ToolContent[]) : [];
  const text = parts.flatMap((part) => (part.type === "text" && part.text ? [part.text] : [])).join("\n\n");
  if (text) return text;
  return result.structuredContent ? JSON.stringify(result.structuredContent) : "";
}

async function callOnce(tool: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const integrations = getIntegrationRepository();
  const record = integrations.get(JURISPRUDENCIAS_PROVIDER);
  if (record?.unreadable) throw new JurisprudenciasNotConnectedError(UNREADABLE_MESSAGE);
  if (!record?.tokens || !record.connectedAt) throw new JurisprudenciasNotConnectedError();

  const authProvider = createJurisprudenciasAuthProvider({
    integrations,
    redirectUrl: record.redirectUri ?? callbackUrl(""),
  });
  const client = new Client({ name: CLIENT_NAME, version: getReleaseInfo().version });
  const transport = new StreamableHTTPClientTransport(new URL(JURISPRUDENCIAS_MCP_URL), { authProvider });
  const options = { signal, timeout: CALL_TIMEOUT_MS };
  try {
    await client.connect(transport, options);
    const result = await client.callTool({ name: tool, arguments: args }, undefined, options);
    const text = resultText(result);
    if (result.isError) throw isLimitMessage(text) ? new JurisprudenciasLimitError() : new JurisprudenciasCallError(text);
    return text;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      integrations.update(JURISPRUDENCIAS_PROVIDER, { lastError: RECONNECT_MESSAGE });
      throw new JurisprudenciasNotConnectedError(RECONNECT_MESSAGE);
    }
    throw error;
  } finally {
    await client.close().catch(() => undefined);
  }
}

/**
 * Calls a tool of the office's Jurisprudências.ai account. Every call is recorded in the usage log
 * (operation "jurisprudencia"), so Integrações can show how much of today's allowance was used.
 */
export const callJurisprudencias: JurisprudenciasCaller = async (tool, args, { signal } = {}) => {
  const usage = getUsageRepository();
  const model = usageModelOf(tool);
  const audited = withUsageAudit(async () => ({ text: await callOnce(tool, args, signal), model, usage: NO_USAGE }), {
    operation: "jurisprudencia",
    provider: JURISPRUDENCIAS_PROVIDER,
    configuredModel: model,
    record: (call) => usage.record(call, currentActorId()),
  });
  return (await audited()).text;
};
