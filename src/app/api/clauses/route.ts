import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { clauseInputSchema } from "@/lib/clauses/schema";
import { HTTP_CREATED, type ClauseResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

/** Clauses are shared by the whole office; any user can add one. */
export const POST = defineRoute({ body: clauseInputSchema }, ({ body }) => {
  const clause = getClauseRepository().create(body);
  return Response.json({ clause } satisfies ClauseResponseBody, { status: HTTP_CREATED });
});
