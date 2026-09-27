import { FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { asMinutaGenerator } from "../chatPrompt";
import { LlmOutputError } from "../errors";
import { GEMINI_MODEL } from "./config";
import { createGeminiChatGenerator } from "./generate";

/** The single-turn drafting call, as getMinutaGenerator builds it. */
const createGeminiGenerator = (client: GoogleGenAI) => asMinutaGenerator(createGeminiChatGenerator(client));

const PROMPT = { system: "Você é um advogado.", user: "Redija um NDA.", temperature: 0.3 };

interface FakeResponse {
  text?: string;
  candidates?: { finishReason?: FinishReason }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

function fakeClient(response: FakeResponse) {
  const generateContent = vi.fn(() => Promise.resolve(response));
  const client = { models: { generateContent } } as unknown as GoogleGenAI;
  return { client, generateContent };
}

describe("createGeminiGenerator", () => {
  it("returns the text, model and usage and sends the system prompt and temperature in the config", async () => {
    const { client, generateContent } = fakeClient({
      text: "# ACORDO",
      candidates: [{ finishReason: FinishReason.STOP }],
      usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 2100, thoughtsTokenCount: 700 },
    });

    await expect(createGeminiGenerator(client)(PROMPT)).resolves.toEqual({
      text: "# ACORDO",
      model: GEMINI_MODEL,
      usage: { inputTokens: 900, outputTokens: 2100, thinkingTokens: 700 },
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: PROMPT.user }] }],
        config: expect.objectContaining({
          systemInstruction: PROMPT.system,
          temperature: PROMPT.temperature,
        }),
      }),
    );
  });

  it.each([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION])(
    "treats finish reason %s as a refusal",
    async (finishReason) => {
      const { client } = fakeClient({ text: "", candidates: [{ finishReason }] });
      await expect(createGeminiGenerator(client)(PROMPT)).rejects.toMatchObject({ reason: "refusal" });
    },
  );

  it("treats a blocked prompt as a refusal", async () => {
    const { client } = fakeClient({ promptFeedback: { blockReason: "SAFETY" } });
    await expect(createGeminiGenerator(client)(PROMPT)).rejects.toMatchObject({ reason: "refusal" });
  });

  it("reports output cut at the token limit as truncated, keeping the billed usage", async () => {
    const { client } = fakeClient({
      text: "# ACORDO",
      candidates: [{ finishReason: FinishReason.MAX_TOKENS }],
      usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 60000, thoughtsTokenCount: 5536 },
    });
    await expect(createGeminiGenerator(client)(PROMPT)).rejects.toEqual(
      new LlmOutputError("truncated", { inputTokens: 900, outputTokens: 60000, thinkingTokens: 5536 }),
    );
  });
});

describe("createGeminiChatGenerator", () => {
  it("sends the conversation with Gemini's role names", async () => {
    const { client, generateContent } = fakeClient({ text: "Resposta", candidates: [{ finishReason: FinishReason.STOP }] });
    await createGeminiChatGenerator(client)({
      system: "Você é um assistente.",
      messages: [
        { role: "user", content: "Olá" },
        { role: "assistant", content: "Oi!" },
        { role: "user", content: "E agora?" },
      ],
      temperature: 0.4,
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: "user", parts: [{ text: "Olá" }] },
          { role: "model", parts: [{ text: "Oi!" }] },
          { role: "user", parts: [{ text: "E agora?" }] },
        ],
      }),
    );
  });
});
