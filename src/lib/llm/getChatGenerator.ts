import "server-only";
import { currentActorId } from "@/lib/auth/actor";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import type { LlmOperation } from "@/lib/usage/types";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { CHAT_GENERATOR_FACTORIES, CONFIGURED_MODELS, activeLlmProvider } from "./providerRegistry";
import type { ChatGenerator } from "./types";

/** The multi-turn generator of the configured provider, audited under `operation`. */
export function getChatGenerator(operation: LlmOperation): ChatGenerator {
  const provider = activeLlmProvider();
  const usage = getUsageRepository();

  return withUsageAudit((prompt, options) => CHAT_GENERATOR_FACTORIES[provider]()(prompt, options), {
    operation,
    provider,
    configuredModel: CONFIGURED_MODELS[provider](),
    record: (call) => usage.record(call, currentActorId()),
  });
}
