import type { MinutaGenerator } from "../types";
import type { OpenRouterClient } from "./api";
import { checkCompletion } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS } from "./config";

export function createOpenRouterGenerator(client: OpenRouterClient, models: string[]): MinutaGenerator {
  return async ({ system, user, temperature }) =>
    checkCompletion(
      await client.chat({
        models,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
        max_tokens: OPENROUTER_MAX_TOKENS,
      }),
    );
}
