import { MinutaGenerationError } from "../errors";
import type { EmbedFunction } from "../embeddings";
import type { TokenUsage } from "../types";
import { LOCAL_EMBEDDING_DIMENSIONS, LOCAL_EMBEDDING_MODEL_ID, formatLocalEmbeddingInput } from "./config";

/** The slice of a Transformers.js feature-extraction pipeline the embedder uses. */
export interface FeatureExtractor {
  (texts: string[], options: { pooling: "mean"; normalize: boolean }): Promise<{ tolist(): unknown }>;
  tokenizer: { encode(text: string): number[] };
}

/** Embeds on the CPU with the local model; usage counts tokens so the audit shows real volumes at $0. */
export function createLocalEmbed(loadExtractor: () => Promise<FeatureExtractor>): EmbedFunction {
  return async (texts, task) => {
    const extractor = await loadExtractor();
    const inputs = texts.map((text) => formatLocalEmbeddingInput(text, task));
    const usage: TokenUsage = {
      inputTokens: inputs.reduce((total, input) => total + extractor.tokenizer.encode(input).length, 0),
      outputTokens: 0,
      thinkingTokens: 0,
    };
    const output = (await extractor(inputs, { pooling: "mean", normalize: true })).tolist() as number[][];
    if (output.length !== texts.length || output.some((vector) => vector.length !== LOCAL_EMBEDDING_DIMENSIONS)) {
      throw new MinutaGenerationError("invalid_output", usage);
    }
    return { embeddings: output, model: LOCAL_EMBEDDING_MODEL_ID, usage };
  };
}
