import type { ChatGenerator } from "../types";
import type { OpenRouterClient } from "./api";
import { checkCompletion } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS } from "./config";

export function createOpenRouterChatGenerator(client: OpenRouterClient, models: string[]): ChatGenerator {
  return async ({ system, messages, temperature }, options = {}) =>
    checkCompletion(
      await client.chat(
        {
          models,
          messages: [{ role: "system", content: system }, ...messages],
          temperature,
          max_tokens: OPENROUTER_MAX_TOKENS,
        },
        { signal: options.signal },
      ),
    );
}
