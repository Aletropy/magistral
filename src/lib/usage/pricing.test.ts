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

  it("returns null for a model missing from the pricing table", () => {
    expect(estimateCostUsd("modelo-desconhecido", { inputTokens: 1, outputTokens: 1, thinkingTokens: 0 })).toBeNull();
  });
});
