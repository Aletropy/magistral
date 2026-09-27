import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT } from "@/lib/http/status";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

const SOURCE_NOT_FOUND_MESSAGE = "Documento não encontrado na biblioteca.";

/** The library is shared by the office, so only admins remove documents from it. */
export const DELETE = defineRoute({ access: "admin" }, async (_input, ctx: RouteContext<"/api/library/sources/[id]">) => {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || !getLibraryRepository().deleteSource(id)) {
    return errorResponse(HTTP_NOT_FOUND, SOURCE_NOT_FOUND_MESSAGE);
  }
  return new Response(null, { status: HTTP_NO_CONTENT });
});
