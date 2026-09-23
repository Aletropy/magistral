import { MinutaGenerationError } from "@/lib/llm/errors";
import type { GenerationOptions, TokenUsage } from "@/lib/llm/types";
import { styleExtractionSchema, type StyleExtraction } from "./styleProfileSchema";

export interface StyleExtractionResult {
  extraction: StyleExtraction;
  model: string;
  usage: TokenUsage;
}

/** Provider-specific call that profiles a reference document's style, or throws. */
export type StyleExtractor = (documentText: string, options?: GenerationOptions) => Promise<StyleExtractionResult>;

/** Validates the model's JSON answer; anything malformed is an "invalid_output" failure that keeps the usage. */
export function parseExtraction(json: string | null | undefined, usage: TokenUsage): StyleExtraction {
  try {
    return styleExtractionSchema.parse(JSON.parse(json ?? ""));
  } catch {
    throw new MinutaGenerationError("invalid_output", usage);
  }
}
