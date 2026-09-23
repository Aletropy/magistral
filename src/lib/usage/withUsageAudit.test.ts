import { describe, expect, it, vi } from "vitest";
import { LlmConfigurationError, MinutaGenerationError } from "@/lib/llm/errors";
import type { MinutaGenerator } from "@/lib/llm/types";
import type { NewLlmCall } from "./types";
import { withUsageAudit } from "./withUsageAudit";

const PROMPT = { system: "s", user: "u", temperature: 0.2 };
const USAGE = { inputTokens: 1000, outputTokens: 2000, thinkingTokens: 500 };
const START_MS = 1000;
const END_MS = 3500;

function audited(generate: MinutaGenerator) {
  const record = vi.fn<(call: NewLlmCall) => void>();
  const now = vi.fn().mockReturnValueOnce(START_MS).mockReturnValueOnce(END_MS);
  const wrapped = withUsageAudit(generate, {
    operation: "minuta",
    provider: "gemini",
    configuredModel: "gemini-2.5-flash",
    record,
    now,
  });
  return { wrapped, record };
}

describe("withUsageAudit", () => {
  it("records a successful call with the served model, tokens, latency and cost", async () => {
    const result = { text: "# OK", model: "gemini-2.5-flash", usage: USAGE };
    const { wrapped, record } = audited(async () => result);

    await expect(wrapped(PROMPT)).resolves.toBe(result);
    expect(record).toHaveBeenCalledWith({
      operation: "minuta",
      provider: "gemini",
      model: "gemini-2.5-flash",
      ...USAGE,
      latencyMs: END_MS - START_MS,
      estimatedCostUsd: expect.any(Number),
      status: "ok",
    });
  });

  it("records a generation failure with the tokens billed before it, then rethrows", async () => {
    const failure = new MinutaGenerationError("truncated", USAGE);
    const { wrapped, record } = audited(async () => {
      throw failure;
    });

    await expect(wrapped(PROMPT)).rejects.toBe(failure);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ ...USAGE, status: "truncated" }));
  });

  it.each([
    [new LlmConfigurationError("no key"), "configuration"],
    [new Error("socket hang up"), "upstream"],
  ] as const)("records %s as %s with zero tokens", async (error, status) => {
    const { wrapped, record } = audited(async () => {
      throw error;
    });

    await expect(wrapped(PROMPT)).rejects.toBe(error);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-2.5-flash", inputTokens: 0, outputTokens: 0, status }),
    );
  });

  it("still returns the result when recording fails", async () => {
    const result = { text: "# OK", model: "gemini-2.5-flash", usage: USAGE };
    const { wrapped, record } = audited(async () => result);
    record.mockImplementation(() => {
      throw new Error("disk full");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(wrapped(PROMPT)).resolves.toBe(result);
  });
});
