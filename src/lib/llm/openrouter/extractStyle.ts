import { buildStyleExtractionPrompt } from "@/lib/style/buildStyleExtractionPrompt";
import { parseExtraction, type StyleExtractor } from "@/lib/style/extractor";
import { STYLE_EXTRACTION_JSON_SCHEMA } from "@/lib/style/styleProfileSchema";
import { STYLE_EXTRACTION_TEMPERATURE } from "../gemini/config";
import type { ChatRequest, OpenRouterClient } from "./api";
import { checkCompletion } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS } from "./config";

const STYLE_SCHEMA_NAME = "perfil_de_estilo";
/** Strict-mode validators on some providers reject the `$schema` meta keyword, so it is dropped. */
const STRICT_STYLE_SCHEMA = Object.fromEntries(
  Object.entries(STYLE_EXTRACTION_JSON_SCHEMA).filter(([key]) => key !== "$schema"),
);

/** Asks OpenRouter for the style profile as JSON, routed only to providers that enforce the schema. */
export function createOpenRouterStyleExtractor(client: OpenRouterClient, models: string[]): StyleExtractor {
  return async (documentText, options = {}) => {
    const { system, user, temperature } = buildStyleExtractionPrompt(documentText, STYLE_EXTRACTION_TEMPERATURE);
    const request: ChatRequest = {
      models,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: OPENROUTER_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: { name: STYLE_SCHEMA_NAME, strict: true, schema: STRICT_STYLE_SCHEMA },
      },
      provider: { require_parameters: true },
    };
    const { text, model, usage } = checkCompletion(await client.chat(request, { signal: options.signal }));
    return { extraction: parseExtraction(text, usage), model, usage };
  };
}
