import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { MinutaGenerationError } from "../errors";
import { ANTHROPIC_MODEL, REFUSAL_FALLBACK_BETA, REFUSAL_FALLBACK_MODE } from "./config";
import { createAnthropicGenerator } from "./generate";

const PROMPT = { system: "Você é um advogado.", user: "Redija um NDA." };

interface FakeMessage {
  stop_reason: string;
  content: { type: string; text?: string }[];
}

function fakeClient(message: FakeMessage) {
  const stream = vi.fn(() => ({ finalMessage: () => Promise.resolve(message) }));
  const client = { beta: { messages: { stream } } } as unknown as Anthropic;
  return { client, stream };
}

describe("createAnthropicGenerator", () => {
  it("joins the text blocks, ignores other block types and enables refusal fallback", async () => {
    const { client, stream } = fakeClient({
      stop_reason: "end_turn",
      content: [
        { type: "thinking" },
        { type: "text", text: "# ACORDO\n\n" },
        { type: "text", text: "Texto." },
      ],
    });

    await expect(createAnthropicGenerator(client)(PROMPT)).resolves.toBe("# ACORDO\n\nTexto.");
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ANTHROPIC_MODEL,
        system: PROMPT.system,
        betas: [REFUSAL_FALLBACK_BETA],
        fallbacks: REFUSAL_FALLBACK_MODE,
      }),
    );
  });

  it.each([
    ["refusal", "refusal"],
    ["max_tokens", "truncated"],
  ] as const)("throws on stop_reason %s (%s)", async (stopReason, reason) => {
    const { client } = fakeClient({ stop_reason: stopReason, content: [{ type: "text", text: "…" }] });
    await expect(createAnthropicGenerator(client)(PROMPT)).rejects.toEqual(
      new MinutaGenerationError(reason),
    );
  });
});
