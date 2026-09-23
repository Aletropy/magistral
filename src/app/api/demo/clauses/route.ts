import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { loadDemoClauses } from "@/lib/demo/loadDemo";
import { errorResponse, type DemoLoadedResponseBody } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

/** Adds the example clauses (idempotent). */
export async function POST(): Promise<Response> {
  try {
    return Response.json({ added: loadDemoClauses(getClauseRepository()) } satisfies DemoLoadedResponseBody);
  } catch (error) {
    console.error("[api/demo/clauses] load failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
