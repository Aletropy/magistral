import { FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { MinutaGenerationError } from "../errors";
import { GEMINI_MODEL } from "./config";
import { createGeminiGenerator } from "./generate";

const PROMPT = { system: "Você é um advogado.", user: "Redija um NDA." };

interface FakeResponse {
  text?: string;
  candidates?: { finishReason?: FinishReason }[];
  promptFeedback?: { blockReason?: string };
}

function fakeClient(response: FakeResponse) {
  const generateContent = vi.fn(() => Promise.resolve(response));
  const client = { models: { generateContent } } as unknown as GoogleGenAI;
  return { client, generateContent };
}

describe("createGeminiGenerator", () => {
  it("returns the response text and sends the system prompt as systemInstruction", async () => {
    const { client, generateContent } = fakeClient({
      text: "# ACORDO",
      candidates: [{ finishReason: FinishReason.STOP }],
    });

    await expect(createGeminiGenerator(client)(PROMPT)).resolves.toBe("# ACORDO");
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: GEMINI_MODEL,
        contents: PROMPT.user,
        config: expect.objectContaining({ systemInstruction: PROMPT.system }),
      }),
    );
  });

  it.each([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION])(
    "treats finish reason %s as a refusal",
    async (finishReason) => {
      const { client } = fakeClient({ text: "", candidates: [{ finishReason }] });
      await expect(createGeminiGenerator(client)(PROMPT)).rejects.toEqual(
        new MinutaGenerationError("refusal"),
      );
    },
  );

  it("treats a blocked prompt as a refusal", async () => {
    const { client } = fakeClient({ promptFeedback: { blockReason: "SAFETY" } });
    await expect(createGeminiGenerator(client)(PROMPT)).rejects.toEqual(
      new MinutaGenerationError("refusal"),
    );
  });

  it("reports output cut at the token limit as truncated", async () => {
    const { client } = fakeClient({
      text: "# ACORDO",
      candidates: [{ finishReason: FinishReason.MAX_TOKENS }],
    });
    await expect(createGeminiGenerator(client)(PROMPT)).rejects.toEqual(
      new MinutaGenerationError("truncated"),
    );
  });
});
