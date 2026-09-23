import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { CLAUSE_NOT_FOUND_MESSAGE } from "@/lib/clauses/messages";
import { clauseInputSchema } from "@/lib/clauses/schema";
import {
  HTTP_NOT_FOUND,
  HTTP_NO_CONTENT,
  errorResponse,
  parseJsonBody,
  type ClauseResponseBody,
} from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

export async function PUT(request: Request, ctx: RouteContext<"/api/clauses/[id]">): Promise<Response> {
  const parsed = await parseJsonBody(request, clauseInputSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;

  try {
    const clause = getClauseRepository().update(id, parsed.data);
    if (!clause) return errorResponse(HTTP_NOT_FOUND, CLAUSE_NOT_FOUND_MESSAGE);
    return Response.json({ clause } satisfies ClauseResponseBody);
  } catch (error) {
    console.error("[api/clauses] update failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/clauses/[id]">): Promise<Response> {
  const { id } = await ctx.params;

  try {
    if (!getClauseRepository().delete(id)) return errorResponse(HTTP_NOT_FOUND, CLAUSE_NOT_FOUND_MESSAGE);
    return new Response(null, { status: HTTP_NO_CONTENT });
  } catch (error) {
    console.error("[api/clauses] delete failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
