import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { CLAUSE_NOT_FOUND_MESSAGE } from "@/lib/clauses/messages";
import { clauseInputSchema } from "@/lib/clauses/schema";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT, errorResponse, type ClauseResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";

type Context = RouteContext<"/api/clauses/[id]">;

export const PUT = defineRoute({ body: clauseInputSchema }, async ({ body }, ctx: Context) => {
  const clause = getClauseRepository().update((await ctx.params).id, body);
  if (!clause) return errorResponse(HTTP_NOT_FOUND, CLAUSE_NOT_FOUND_MESSAGE);
  return Response.json({ clause } satisfies ClauseResponseBody);
});

/** Removing a shared clause affects the whole office, so only admins can. */
export const DELETE = defineRoute({ access: "admin" }, async (_input, ctx: Context) => {
  if (!getClauseRepository().delete((await ctx.params).id)) return errorResponse(HTTP_NOT_FOUND, CLAUSE_NOT_FOUND_MESSAGE);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
