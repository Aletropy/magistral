import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ANTHROPIC_MODEL, REFUSAL_FALLBACK_BETA, REFUSAL_FALLBACK_MODE } from "./config";
import { createAnthropicGenerator } from "./generate";

const PROMPT = { system: "Você é um advogado.", user: "Redija um NDA.", temperature: 0.3 };

interface FakeMessage {
  stop_reason: string;
  content: { type: string; text?: string }[];
}

const SERVED_MODEL = "claude-opus-4-8";
const USAGE = { input_tokens: 1200, output_tokens: 3400 };
const EXPECTED_USAGE = { inputTokens: 1200, outputTokens: 3400, thinkingTokens: 0 };

function fakeClient(fake: FakeMessage) {
  const message = { ...fake, model: SERVED_MODEL, usage: USAGE };
  const stream = vi.fn(() => ({ finalMessage: () => Promise.resolve(message) }));
  const client = { beta: { messages: { stream } } } as unknown as Anthropic;
  return { client, stream };
}

describe("createAnthropicGenerator", () => {
  it("joins the text blocks, reports the served model and usage, and enables refusal fallback", async () => {
    const { client, stream } = fakeClient({
      stop_reason: "end_turn",
      content: [
        { type: "thinking" },
        { type: "text", text: "# ACORDO\n\n" },
        { type: "text", text: "Texto." },
      ],
    });

    await expect(createAnthropicGenerator(client)(PROMPT)).resolves.toEqual({
      text: "# ACORDO\n\nTexto.",
      model: SERVED_MODEL,
      usage: EXPECTED_USAGE,
    });
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ANTHROPIC_MODEL,
        system: PROMPT.system,
        betas: [REFUSAL_FALLBACK_BETA],
        fallbacks: REFUSAL_FALLBACK_MODE,
      }),
      { signal: undefined },
    );
  });

  it("passes the cancel signal to the SDK", async () => {
    const { client, stream } = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: "# ACORDO" }] });
    const { signal } = new AbortController();
    await createAnthropicGenerator(client)(PROMPT, { signal });
    expect(stream).toHaveBeenCalledWith(expect.anything(), { signal });
  });

  it("does not send the temperature, which Claude Opus 5 rejects", async () => {
    const { client, stream } = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: "# ACORDO" }] });
    await createAnthropicGenerator(client)(PROMPT);
    expect(stream).toHaveBeenCalledWith(
      expect.not.objectContaining({ temperature: expect.anything() }),
      expect.anything(),
    );
  });

  it.each([
    ["refusal", "refusal"],
    ["max_tokens", "truncated"],
  ] as const)("throws on stop_reason %s (%s), keeping the billed usage", async (stopReason, reason) => {
    const { client } = fakeClient({ stop_reason: stopReason, content: [{ type: "text", text: "…" }] });
    await expect(createAnthropicGenerator(client)(PROMPT)).rejects.toMatchObject({
      reason,
      usage: EXPECTED_USAGE,
    });
  });
});
