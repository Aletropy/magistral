import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { clauseInputSchema } from "@/lib/clauses/schema";
import type { ClauseResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CREATED } from "@/lib/http/status";

/** Clauses are shared by the whole office; any user can add one. */
export const POST = defineRoute({ body: clauseInputSchema }, ({ body }) => {
  const clause = getClauseRepository().create(body);
  return Response.json({ clause } satisfies ClauseResponseBody, { status: HTTP_CREATED });
});
