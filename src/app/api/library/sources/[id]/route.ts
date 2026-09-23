import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

const SOURCE_NOT_FOUND_MESSAGE = "Documento não encontrado na biblioteca.";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/library/sources/[id]">): Promise<Response> {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id)) return errorResponse(HTTP_NOT_FOUND, SOURCE_NOT_FOUND_MESSAGE);

  try {
    if (!getLibraryRepository().deleteSource(id)) return errorResponse(HTTP_NOT_FOUND, SOURCE_NOT_FOUND_MESSAGE);
    return new Response(null, { status: HTTP_NO_CONTENT });
  } catch (error) {
    console.error("[api/library/sources] delete failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
