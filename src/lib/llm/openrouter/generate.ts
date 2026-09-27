import type { ChatGenerator } from "../types";
import type { OpenRouterClient } from "./api";
import { checkCompletion } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS, PRIVATE_ROUTING, type ProviderRouting } from "./config";

export function createOpenRouterChatGenerator(
  client: OpenRouterClient,
  models: string[],
  routing: ProviderRouting = PRIVATE_ROUTING,
): ChatGenerator {
  return async ({ system, messages, temperature }, options = {}) =>
    checkCompletion(
      await client.chat(
        {
          models,
          messages: [{ role: "system", content: system }, ...messages],
          temperature,
          max_tokens: OPENROUTER_MAX_TOKENS,
          provider: routing,
        },
        { signal: options.signal },
      ),
    );
}
