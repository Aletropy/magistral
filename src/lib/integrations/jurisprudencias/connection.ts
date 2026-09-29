import "server-only";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { resolvePublicUrl } from "@/lib/config/publicUrl";
import { AppError } from "@/lib/errors/AppError";
import { logEvent } from "@/lib/log";
import { getIntegrationRepository } from "../getIntegrationRepository";
import { JURISPRUDENCIAS_CALLBACK_PATH, JURISPRUDENCIAS_MCP_URL, JURISPRUDENCIAS_PROVIDER } from "./config";
import {
  AUTHORIZATION_DENIED_MESSAGE,
  AUTHORIZATION_FAILED_MESSAGE,
  INVALID_STATE_MESSAGE,
  JurisprudenciasAuthorizationError,
  UNREADABLE_MESSAGE,
} from "./errors";
import { createJurisprudenciasAuthProvider } from "./oauthProvider";

/** The callback on the public address when there is one (behind Caddy), else on the address in use. */
export function callbackUrl(requestOrigin: string): string {
  return `${resolvePublicUrl() ?? requestOrigin}${JURISPRUDENCIAS_CALLBACK_PATH}`;
}

export interface ConnectionStatus {
  connected: boolean;
  connectedByName: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

export function connectionStatus(): ConnectionStatus {
  const record = getIntegrationRepository().get(JURISPRUDENCIAS_PROVIDER);
  return {
    connected: Boolean(record?.tokens && record.connectedAt),
    connectedByName: record?.connectedByName ?? null,
    connectedAt: record?.connectedAt ?? null,
    lastError: record?.unreadable ? UNREADABLE_MESSAGE : (record?.lastError ?? null),
  };
}

/** Whether the assistant can search: connected, and the server can open the saved tokens. */
export function isJurisprudenciasConnected(): boolean {
  try {
    return connectionStatus().connected;
  } catch {
    // Without MAGISTRAL_SECRET_KEY there is no connection to use.
    return false;
  }
}

/**
 * Begins the office's connection: registers Magistral with the service if needed and returns the page
 * where the admin authorizes it. Any previous tokens are dropped, so this also reconnects.
 */
export async function startAuthorization(requestOrigin: string): Promise<URL> {
  const integrations = getIntegrationRepository();
  integrations.update(JURISPRUDENCIAS_PROVIDER, { tokens: null, lastError: null });
  const provider = createJurisprudenciasAuthProvider({ integrations, redirectUrl: callbackUrl(requestOrigin) });
  try {
    await auth(provider, { serverUrl: JURISPRUDENCIAS_MCP_URL });
  } catch (error) {
    logEvent("error", "integration.authorize_failed", { provider: JURISPRUDENCIAS_PROVIDER }, error);
    integrations.update(JURISPRUDENCIAS_PROVIDER, { lastError: AUTHORIZATION_FAILED_MESSAGE });
    throw new JurisprudenciasAuthorizationError(AUTHORIZATION_FAILED_MESSAGE);
  }
  const url = provider.authorizationUrl();
  if (!url) throw new JurisprudenciasAuthorizationError(AUTHORIZATION_FAILED_MESSAGE);
  return url;
}

function sameState(expected: string | null, received: string): boolean {
  if (!expected) return false;
  const [a, b] = [Buffer.from(expected), Buffer.from(received)];
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface AuthorizationReturn {
  requestOrigin: string;
  code: string | null;
  state: string | null;
  /** The service's `error` parameter, e.g. "access_denied". */
  error: string | null;
  userId: string;
}

/** Completes the connection when the service sends the admin back: checks the state, trades the code for tokens. */
export async function finishAuthorization({ requestOrigin, code, state, error, userId }: AuthorizationReturn): Promise<void> {
  const integrations = getIntegrationRepository();
  const record = integrations.get(JURISPRUDENCIAS_PROVIDER);
  const fail = (message: string): never => {
    integrations.update(JURISPRUDENCIAS_PROVIDER, { lastError: message, oauthState: null });
    throw new JurisprudenciasAuthorizationError(message);
  };
  if (error) fail(AUTHORIZATION_DENIED_MESSAGE);
  if (!code || !state || !sameState(record?.oauthState ?? null, state)) fail(INVALID_STATE_MESSAGE);

  const provider = createJurisprudenciasAuthProvider({ integrations, redirectUrl: callbackUrl(requestOrigin) });
  try {
    const result = await auth(provider, { serverUrl: JURISPRUDENCIAS_MCP_URL, authorizationCode: code! });
    if (result !== "AUTHORIZED") fail(AUTHORIZATION_FAILED_MESSAGE);
  } catch (caught) {
    if (caught instanceof AppError) throw caught;
    logEvent("error", "integration.token_exchange_failed", { provider: JURISPRUDENCIAS_PROVIDER }, caught);
    fail(AUTHORIZATION_FAILED_MESSAGE);
  }
  integrations.markConnected(JURISPRUDENCIAS_PROVIDER, userId);
}

/** Forgets the office's connection: tokens and registration. Access can also be revoked on the service. */
export function disconnect(): void {
  getIntegrationRepository().delete(JURISPRUDENCIAS_PROVIDER);
}
