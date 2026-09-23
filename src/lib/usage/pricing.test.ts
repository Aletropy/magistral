import { describe, expect, it } from "vitest";
import { MODEL_PRICING, estimateCostUsd } from "./pricing";

describe("estimateCostUsd", () => {
  it("prices input and output per million tokens, billing thinking as output", () => {
    const { inputUsdPerMTok, outputUsdPerMTok } = MODEL_PRICING["gemini-2.5-flash"];
    const cost = estimateCostUsd("gemini-2.5-flash", {
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      thinkingTokens: 500_000,
    });
    expect(cost).toBeCloseTo(inputUsdPerMTok + outputUsdPerMTok);
  });

  it("prices free OpenRouter models and local models at zero", () => {
    const usage = { inputTokens: 5000, outputTokens: 5000, thinkingTokens: 0 };
    expect(estimateCostUsd("qwen/qwen3.8-27b:free", usage)).toBe(0);
    expect(estimateCostUsd("local/embeddinggemma-300m", usage)).toBe(0);
  });

  it("returns null for a model missing from the pricing table", () => {
    expect(estimateCostUsd("modelo-desconhecido", { inputTokens: 1, outputTokens: 1, thinkingTokens: 0 })).toBeNull();
  });
});
