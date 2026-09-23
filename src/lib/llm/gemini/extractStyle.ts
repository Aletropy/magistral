import type { GoogleGenAI } from "@google/genai";
import { buildStyleExtractionPrompt } from "@/lib/style/buildStyleExtractionPrompt";
import {
  STYLE_EXTRACTION_JSON_SCHEMA,
  styleExtractionSchema,
  type StyleExtraction,
} from "@/lib/style/styleProfileSchema";
import { MinutaGenerationError } from "../errors";
import type { TokenUsage } from "../types";
import { checkGeminiResponse } from "./checkResponse";
import {
  STYLE_EXTRACTION_MAX_OUTPUT_TOKENS,
  STYLE_EXTRACTION_MODEL,
  STYLE_EXTRACTION_TEMPERATURE,
} from "./config";

export interface StyleExtractionResult {
  extraction: StyleExtraction;
  model: string;
  usage: TokenUsage;
}

export type StyleExtractor = (documentText: string) => Promise<StyleExtractionResult>;

function parseExtraction(json: string | undefined, usage: TokenUsage): StyleExtraction {
  try {
    return styleExtractionSchema.parse(JSON.parse(json ?? ""));
  } catch {
    throw new MinutaGenerationError("invalid_output", usage);
  }
}

/** Sends the document text to Gemini with a JSON schema and returns the validated style profile. */
export function createGeminiStyleExtractor(client: GoogleGenAI): StyleExtractor {
  return async (documentText) => {
    const { system, user, temperature } = buildStyleExtractionPrompt(documentText, STYLE_EXTRACTION_TEMPERATURE);
    const response = await client.models.generateContent({
      model: STYLE_EXTRACTION_MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens: STYLE_EXTRACTION_MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        responseJsonSchema: STYLE_EXTRACTION_JSON_SCHEMA,
      },
    });

    const usage = checkGeminiResponse(response);
    return { extraction: parseExtraction(response.text, usage), model: STYLE_EXTRACTION_MODEL, usage };
  };
}
