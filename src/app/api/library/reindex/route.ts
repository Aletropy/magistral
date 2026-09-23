import { errorResponse, type LibraryReindexResponseBody } from "@/lib/http/api";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { describeDraftingFailure } from "@/lib/minuta/errors";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { reindexLibrary } from "@/lib/rag/reindexLibrary";

/** Re-embedding a large library on the CPU takes a while, and the first run downloads the model. */
export const maxDuration = 600;

/** Rebuilds the vector index with the embedding model configured now. */
export async function POST(): Promise<Response> {
  try {
    const embedding = getEmbedder();
    const chunks = await reindexLibrary(getLibraryRepository(), embedding);
    return Response.json({ chunks, model: embedding.id } satisfies LibraryReindexResponseBody);
  } catch (error) {
    console.error("[api/library/reindex] reindex failed", error);
    const { status, message } = describeDraftingFailure(error);
    return errorResponse(status, message);
  }
}
