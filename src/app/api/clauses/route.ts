import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { clauseInputSchema } from "@/lib/clauses/schema";
import { HTTP_CREATED, errorResponse, parseJsonBody, type ClauseResponseBody } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, clauseInputSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const clause = getClauseRepository().create(parsed.data);
    return Response.json({ clause } satisfies ClauseResponseBody, { status: HTTP_CREATED });
  } catch (error) {
    console.error("[api/clauses] create failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
