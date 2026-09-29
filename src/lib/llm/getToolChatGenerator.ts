import "server-only";
import { currentActorId } from "@/lib/auth/actor";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import type { LlmOperation } from "@/lib/usage/types";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { CONFIGURED_MODELS, TOOL_GENERATOR_FACTORIES, activeLlmProvider } from "./providerRegistry";
import type { ToolChatGenerator } from "./tools/types";

/** The configured provider's tool-calling generator; every step is audited under `operation`. */
export function getToolChatGenerator(operation: LlmOperation): ToolChatGenerator {
  const provider = activeLlmProvider();
  const usage = getUsageRepository();

  return withUsageAudit((prompt, options) => TOOL_GENERATOR_FACTORIES[provider]()(prompt, options), {
    operation,
    provider,
    configuredModel: CONFIGURED_MODELS[provider](),
    record: (call) => usage.record(call, currentActorId()),
  });
}
