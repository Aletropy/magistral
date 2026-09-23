import type { GoogleGenAI } from "@google/genai";
import { buildStyleExtractionPrompt } from "@/lib/style/buildStyleExtractionPrompt";
import { parseExtraction, type StyleExtractor } from "@/lib/style/extractor";
import { STYLE_EXTRACTION_JSON_SCHEMA } from "@/lib/style/styleProfileSchema";
import { checkGeminiResponse } from "./checkResponse";
import {
  STYLE_EXTRACTION_MAX_OUTPUT_TOKENS,
  STYLE_EXTRACTION_MODEL,
  STYLE_EXTRACTION_TEMPERATURE,
} from "./config";

/** Sends the document text to Gemini with a JSON schema and returns the validated style profile. */
export function createGeminiStyleExtractor(client: GoogleGenAI): StyleExtractor {
  return async (documentText, options = {}) => {
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
        abortSignal: options.signal,
      },
    });

    const usage = checkGeminiResponse(response);
    return { extraction: parseExtraction(response.text, usage), model: STYLE_EXTRACTION_MODEL, usage };
  };
}
