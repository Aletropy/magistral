import { describe, expect, it } from "vitest";
import { LlmConfigurationError } from "./errors";
import { DEFAULT_LLM_PROVIDER, resolveLlmProvider } from "./providers";

describe("resolveLlmProvider", () => {
  it.each([undefined, "", "  "])("uses the default provider for %j", (value) => {
    expect(resolveLlmProvider(value)).toBe(DEFAULT_LLM_PROVIDER);
  });

  it("accepts known providers regardless of case and spacing", () => {
    expect(resolveLlmProvider(" Anthropic ")).toBe("anthropic");
    expect(resolveLlmProvider("GEMINI")).toBe("gemini");
  });

  it("rejects unknown providers as a configuration error", () => {
    expect(() => resolveLlmProvider("openai")).toThrow(LlmConfigurationError);
  });
});
