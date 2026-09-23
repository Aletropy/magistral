import { errorResponse, type LibrarySyncResponseBody } from "@/lib/http/api";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { resolveLibraryDir } from "@/lib/rag/config";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { syncLibraryFolder } from "@/lib/rag/syncFolder";

/** A first sync of a large folder embeds every document. */
export const maxDuration = 600;

export async function POST(): Promise<Response> {
  const folder = resolveLibraryDir();
  try {
    const report = await syncLibraryFolder(getLibraryRepository(), getEmbedder(), folder);
    return Response.json({ folder, report } satisfies LibrarySyncResponseBody);
  } catch (error) {
    console.error("[api/library/sync] sync failed", error);
    const { status, message } = toErrorResponseInfo(error);
    return errorResponse(status, message);
  }
}
