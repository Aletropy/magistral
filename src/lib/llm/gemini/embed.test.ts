import type { GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { axisVector } from "@/lib/rag/testHelpers";
import { EMBEDDING_DIMENSIONS, GEMINI_EMBEDDING_MODEL } from "./config";
import { createGeminiEmbedder } from "./embed";

function fakeClient(vectors: number[][], totalTokens = 42) {
  const embedContent = vi.fn(() => Promise.resolve({ embeddings: vectors.map((values) => ({ values })) }));
  const countTokens = vi.fn(() => Promise.resolve({ totalTokens }));
  return { client: { models: { embedContent, countTokens } } as unknown as GoogleGenAI, embedContent };
}

describe("createGeminiEmbedder", () => {
  it("sends one content per text with the task type and dimensionality, and reports counted tokens", async () => {
    const { client, embedContent } = fakeClient([axisVector(0), axisVector(1)]);

    const result = await createGeminiEmbedder(client)(["Art. 1º", "Art. 2º"], "query");

    expect(result).toEqual({
      embeddings: [axisVector(0), axisVector(1)],
      model: GEMINI_EMBEDDING_MODEL,
      usage: { inputTokens: 42, outputTokens: 0, thinkingTokens: 0 },
    });
    expect(embedContent).toHaveBeenCalledWith({
      model: GEMINI_EMBEDDING_MODEL,
      contents: [
        { role: "user", parts: [{ text: "Art. 1º" }] },
        { role: "user", parts: [{ text: "Art. 2º" }] },
      ],
      config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBEDDING_DIMENSIONS },
    });
  });

  it("rejects a response with the wrong number or size of vectors", async () => {
    await expect(createGeminiEmbedder(fakeClient([axisVector(0)]).client)(["a", "b"], "document")).rejects.toMatchObject({
      reason: "invalid_output",
    });
    await expect(createGeminiEmbedder(fakeClient([[1, 0]]).client)(["a"], "document")).rejects.toMatchObject({
      reason: "invalid_output",
    });
  });
});
