import type { EmbeddingTask } from "@/lib/rag/types";
import type { TokenUsage } from "./types";

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: TokenUsage;
}

/** Embeds one batch of texts for retrieval ("document") or searching ("query"), or throws. */
export type EmbedFunction = (texts: string[], task: EmbeddingTask) => Promise<EmbeddingResult>;

/** An embedding model plus what the vector index needs to know about it. */
export interface EmbeddingModel {
  /** Stable identifier stored with the index, e.g. "local/embeddinggemma-300m". */
  id: string;
  dimensions: number;
  embed: EmbedFunction;
}

/** Texts per embed call: small enough for a CPU model's memory, few enough requests for an API. */
export const EMBED_BATCH_SIZE = 32;

export const EMBEDDING_PROVIDER_ENV_VAR = "EMBEDDING_PROVIDER";
export const EMBEDDING_PROVIDERS = ["local", "gemini"] as const;
export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];
/** Local by default: no key, no quota, and legal texts never leave the machine. */
export const DEFAULT_EMBEDDING_PROVIDER: EmbeddingProvider = "local";

export function resolveEmbeddingProvider(value: string | undefined): EmbeddingProvider {
  const provider = value?.trim().toLowerCase();
  return (EMBEDDING_PROVIDERS as readonly (string | undefined)[]).includes(provider)
    ? (provider as EmbeddingProvider)
    : DEFAULT_EMBEDDING_PROVIDER;
}
