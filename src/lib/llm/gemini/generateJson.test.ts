import { FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { STRUCTURED_OUTPUT_MODEL } from "./config";
import { createGeminiJsonGenerator } from "./generateJson";

const PROMPT = { system: "Você é um linguista.", user: "Texto do documento.", temperature: 0.2 };
const SCHEMA = { name: "perfil", schema: { type: "object", properties: { tom: { type: "string" } } } };
const USAGE_METADATA = { promptTokenCount: 5000, candidatesTokenCount: 800, thoughtsTokenCount: 1200 };

function fakeClient(response: { text?: string; candidates?: { finishReason?: FinishReason }[] }) {
  const generateContent = vi.fn(() => Promise.resolve({ ...response, usageMetadata: USAGE_METADATA }));
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

describe("createGeminiJsonGenerator", () => {
  it("requests JSON with the schema and returns the text, model and usage", async () => {
    const { client, generateContent } = fakeClient({
      text: '{"tom":"direto"}',
      candidates: [{ finishReason: FinishReason.STOP }],
    });
    const { signal } = new AbortController();

    await expect(createGeminiJsonGenerator(client)(PROMPT, SCHEMA, { signal })).resolves.toEqual({
      text: '{"tom":"direto"}',
      model: STRUCTURED_OUTPUT_MODEL,
      usage: { inputTokens: 5000, outputTokens: 800, thinkingTokens: 1200 },
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: STRUCTURED_OUTPUT_MODEL,
        contents: "Texto do documento.",
        config: expect.objectContaining({
          systemInstruction: PROMPT.system,
          responseMimeType: "application/json",
          responseJsonSchema: SCHEMA.schema,
          abortSignal: signal,
        }),
      }),
    );
  });

  it("treats a safety block as a refusal", async () => {
    const { client } = fakeClient({ text: "", candidates: [{ finishReason: FinishReason.SAFETY }] });
    await expect(createGeminiJsonGenerator(client)(PROMPT, SCHEMA)).rejects.toMatchObject({ reason: "refusal" });
  });
});
