import { describe, expect, it, vi } from "vitest";
import { axisVector } from "@/lib/rag/testHelpers";
import { LOCAL_EMBEDDING_MODEL_ID, formatLocalEmbeddingInput } from "./config";
import { createLocalEmbed, type FeatureExtractor } from "./embed";

function fakeExtractor(vectors: number[][]) {
  const call = vi.fn(async () => ({ tolist: () => vectors }));
  const extractor = Object.assign(call, { tokenizer: { encode: (text: string) => text.split(" ") } });
  return { extractor: extractor as unknown as FeatureExtractor, call };
}

describe("formatLocalEmbeddingInput", () => {
  it("uses EmbeddingGemma's retrieval prompts", () => {
    expect(formatLocalEmbeddingInput("quem paga o IPTU?", "query")).toBe("task: search result | query: quem paga o IPTU?");
    expect(formatLocalEmbeddingInput("Art. 5º", "document")).toBe("title: none | text: Art. 5º");
  });
});

describe("createLocalEmbed", () => {
  it("embeds the prompted texts with mean pooling and normalization, counting tokens", async () => {
    const { extractor, call } = fakeExtractor([axisVector(0), axisVector(1)]);

    const result = await createLocalEmbed(async () => extractor)(["um dois", "três"], "document");

    expect(call).toHaveBeenCalledWith(["title: none | text: um dois", "title: none | text: três"], {
      pooling: "mean",
      normalize: true,
    });
    expect(result).toEqual({
      embeddings: [axisVector(0), axisVector(1)],
      model: LOCAL_EMBEDDING_MODEL_ID,
      usage: { inputTokens: 11, outputTokens: 0, thinkingTokens: 0 },
    });
  });

  it("rejects output with the wrong count or size", async () => {
    const { extractor } = fakeExtractor([[1, 0]]);
    await expect(createLocalEmbed(async () => extractor)(["a"], "query")).rejects.toMatchObject({
      reason: "invalid_output",
    });
  });
});
