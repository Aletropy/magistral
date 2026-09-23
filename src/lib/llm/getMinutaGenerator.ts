import "server-only";
import type { LlmOperation } from "@/lib/usage/types";
import { asMinutaGenerator } from "./chatPrompt";
import { getChatGenerator } from "./getChatGenerator";
import type { MinutaGenerator } from "./types";

/**
 * Returns the generator for the provider chosen by the LLM_PROVIDER env var, audited under `operation`.
 * A missing API key is thrown lazily, on the first call, so the failure is recorded too.
 */
export function getMinutaGenerator(operation: LlmOperation): MinutaGenerator {
  return asMinutaGenerator(getChatGenerator(operation));
}
