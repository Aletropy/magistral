import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { LlmConfigurationError, MinutaGenerationError } from "./errors";
import { toErrorResponseInfo } from "./toErrorResponseInfo";

/** Builds the same error subclass the Anthropic SDK raises for an HTTP status. */
function anthropicError(status: number) {
  return Anthropic.APIError.generate(status, undefined, "upstream", new Headers());
}

function geminiError(status: number) {
  return new GeminiApiError({ message: "upstream", status });
}

describe("toErrorResponseInfo", () => {
  it.each([
    ["LLM configuration", new LlmConfigurationError("GEMINI_API_KEY is not set"), 500],
    ["refusal", new MinutaGenerationError("refusal"), 422],
    ["truncated output", new MinutaGenerationError("truncated"), 502],
    ["empty output", new MinutaGenerationError("empty"), 502],
    ["Anthropic authentication", anthropicError(401), 500],
    ["Anthropic rate limit", anthropicError(429), 429],
    ["Anthropic overloaded", anthropicError(529), 503],
    ["Anthropic connection", new Anthropic.APIConnectionError({ message: "offline" }), 503],
    ["Anthropic timeout", new Anthropic.APIConnectionTimeoutError(), 503],
    ["Anthropic bad request", anthropicError(400), 502],
    ["Gemini permission denied", geminiError(403), 500],
    ["Gemini quota exhausted", geminiError(429), 429],
    ["Gemini unavailable", geminiError(503), 503],
    ["Gemini bad request", geminiError(400), 502],
    ["unknown", new Error("boom"), 500],
  ])("maps %s to HTTP %i", (_label, error, status) => {
    expect(toErrorResponseInfo(error).status).toBe(status);
  });

  it("never leaks upstream error details", () => {
    for (const error of [anthropicError(400), geminiError(400)]) {
      expect(toErrorResponseInfo(error).message).not.toContain("upstream");
    }
  });
});
