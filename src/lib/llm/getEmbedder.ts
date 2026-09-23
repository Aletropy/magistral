import "server-only";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import {
  EMBEDDING_PROVIDER_ENV_VAR,
  resolveEmbeddingProvider,
  type EmbedFunction,
  type EmbeddingModel,
  type EmbeddingProvider,
} from "./embeddings";
import { getGeminiClient } from "./gemini/client";
import { EMBEDDING_DIMENSIONS, GEMINI_EMBEDDING_MODEL } from "./gemini/config";
import { createGeminiEmbedder } from "./gemini/embed";
import { LOCAL_EMBEDDING_DIMENSIONS, LOCAL_EMBEDDING_MODEL_ID } from "./local/config";
import { createLocalEmbed } from "./local/embed";
import { loadLocalFeatureExtractor } from "./local/extractor";

interface EmbeddingProviderSetup {
  id: string;
  dimensions: number;
  createEmbed: () => EmbedFunction;
}

const PROVIDERS: Record<EmbeddingProvider, EmbeddingProviderSetup> = {
  local: {
    id: LOCAL_EMBEDDING_MODEL_ID,
    dimensions: LOCAL_EMBEDDING_DIMENSIONS,
    createEmbed: () => createLocalEmbed(loadLocalFeatureExtractor),
  },
  gemini: {
    id: GEMINI_EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    createEmbed: () => (texts, task) => createGeminiEmbedder(getGeminiClient())(texts, task),
  },
};

function activeProvider(): EmbeddingProvider {
  return resolveEmbeddingProvider(process.env[EMBEDDING_PROVIDER_ENV_VAR]);
}

/** Which model the library should be indexed with, without loading it (for status messages). */
export function getActiveEmbeddingIdentity(): { id: string; dimensions: number } {
  const { id, dimensions } = PROVIDERS[activeProvider()];
  return { id, dimensions };
}

/** The embedding model chosen by EMBEDDING_PROVIDER (local by default), audited under "embedding". */
export function getEmbedder(): EmbeddingModel {
  const provider = activeProvider();
  const { id, dimensions, createEmbed } = PROVIDERS[provider];
  const usage = getUsageRepository();
  const embed = withUsageAudit(createEmbed(), {
    operation: "embedding",
    provider,
    configuredModel: id,
    record: (call) => usage.record(call),
  });
  return { id, dimensions, embed };
}
