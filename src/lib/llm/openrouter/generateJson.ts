import type { StructuredGenerator } from "../types";
import type { ChatRequest, OpenRouterClient } from "./api";
import { checkCompletion } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS } from "./config";

/** Strict-mode validators on some providers reject the `$schema` meta keyword, so it is dropped. */
function toStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema"));
}

/** Asks OpenRouter for JSON following a schema, routed only to providers that enforce it. */
export function createOpenRouterJsonGenerator(client: OpenRouterClient, models: string[]): StructuredGenerator {
  return async ({ system, user, temperature }, { name, schema }, options = {}) => {
    const request: ChatRequest = {
      models,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: OPENROUTER_MAX_TOKENS,
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: toStrictSchema(schema) } },
      provider: { require_parameters: true },
    };
    return checkCompletion(await client.chat(request, { signal: options.signal }));
  };
}
