import "server-only";
import path from "node:path";
import { resolveDataDir } from "@/lib/db/config";
import { LOCAL_EMBEDDING_DTYPE, LOCAL_EMBEDDING_REPO, LOCAL_MODELS_SUBDIR } from "./config";
import type { FeatureExtractor } from "./embed";

/** Loaded once per process (kept on globalThis across dev hot reloads); the first call downloads the model. */
const globalForModel = globalThis as typeof globalThis & { magistralEmbedder?: Promise<FeatureExtractor> };

export function loadLocalFeatureExtractor(): Promise<FeatureExtractor> {
  globalForModel.magistralEmbedder ??= (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.cacheDir = path.join(resolveDataDir(), LOCAL_MODELS_SUBDIR);
    return (await pipeline("feature-extraction", LOCAL_EMBEDDING_REPO, {
      dtype: LOCAL_EMBEDDING_DTYPE,
    })) as unknown as FeatureExtractor;
  })().catch((error: unknown) => {
    // Let the next call try again (e.g. after a failed download).
    globalForModel.magistralEmbedder = undefined;
    throw error;
  });
  return globalForModel.magistralEmbedder;
}
