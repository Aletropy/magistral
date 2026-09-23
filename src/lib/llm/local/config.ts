/** EmbeddingGemma 300M: multilingual (pt-BR included), 768 dimensions, runs on CPU through ONNX. */
export const LOCAL_EMBEDDING_REPO = "onnx-community/embeddinggemma-300m-ONNX";
/** Stored with the index and in the usage log. */
export const LOCAL_EMBEDDING_MODEL_ID = "local/embeddinggemma-300m";
export const LOCAL_EMBEDDING_DIMENSIONS = 768;
/** 4-bit weights: a 188 MB one-time download, ~3x faster than 8-bit with the same rankings in our tests. */
export const LOCAL_EMBEDDING_DTYPE = "q4";
/** Downloaded models are cached under <data dir>/models. */
export const LOCAL_MODELS_SUBDIR = "models";

/** EmbeddingGemma was trained with these task prompts; using them improves retrieval. */
export function formatLocalEmbeddingInput(text: string, task: "document" | "query"): string {
  return task === "query" ? `task: search result | query: ${text}` : `title: none | text: ${text}`;
}
