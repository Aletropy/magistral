import { loadDemoLibrary } from "@/lib/demo/loadDemo";
import { errorResponse, type DemoLoadedResponseBody } from "@/lib/http/api";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { describeDraftingFailure } from "@/lib/minuta/errors";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

/** The first run downloads the local embedding model (~190 MB). */
export const maxDuration = 600;

/** Indexes the example norms (idempotent). */
export async function POST(): Promise<Response> {
  try {
    const added = await loadDemoLibrary(getLibraryRepository(), getEmbedder());
    return Response.json({ added } satisfies DemoLoadedResponseBody);
  } catch (error) {
    console.error("[api/demo/library] load failed", error);
    const { status, message } = describeDraftingFailure(error);
    return errorResponse(status, message);
  }
}
