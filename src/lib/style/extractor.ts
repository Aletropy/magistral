import { parseStructured } from "@/lib/llm/parseStructured";
import type { GenerationOptions, StructuredGenerator, TokenUsage } from "@/lib/llm/types";
import { buildStyleExtractionPrompt } from "./buildStyleExtractionPrompt";
import { STYLE_EXTRACTION_JSON_SCHEMA, styleExtractionSchema, type StyleExtraction } from "./styleProfileSchema";

/** Low temperature keeps the analysis faithful to the document. */
export const STYLE_EXTRACTION_TEMPERATURE = 0.2;
const STYLE_SCHEMA_NAME = "perfil_de_estilo";

export interface StyleExtractionResult {
  extraction: StyleExtraction;
  model: string;
  usage: TokenUsage;
}

/** Profiles a reference document's style, or throws. */
export type StyleExtractor = (documentText: string, options?: GenerationOptions) => Promise<StyleExtractionResult>;

/** A style extractor on top of any structured-output generator. */
export function createStyleExtractor(generate: StructuredGenerator): StyleExtractor {
  return async (documentText, options) => {
    const prompt = buildStyleExtractionPrompt(documentText, STYLE_EXTRACTION_TEMPERATURE);
    const schema = { name: STYLE_SCHEMA_NAME, schema: STYLE_EXTRACTION_JSON_SCHEMA };
    const { text, model, usage } = await generate(prompt, schema, options);
    return { extraction: parseStructured(styleExtractionSchema, text, usage), model, usage };
  };
}
