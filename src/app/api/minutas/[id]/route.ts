import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse, parseJsonBody } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";
import { minutaUpdateSchema } from "@/lib/minutas/schema";

/** Saves a reviewed version of the minuta's text. */
export async function PUT(request: Request, ctx: RouteContext<"/api/minutas/[id]">): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;

  try {
    if (!getMinutaRepository().updateMarkdown(id, parsed.data.markdown)) {
      return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
    }
    return new Response(null, { status: HTTP_NO_CONTENT });
  } catch (error) {
    console.error("[api/minutas] update failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/minutas/[id]">): Promise<Response> {
  const { id } = await ctx.params;
  if (!getMinutaRepository().delete(id)) return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
  return new Response(null, { status: HTTP_NO_CONTENT });
}
