import { MAX_MARKDOWN_BODY_BYTES } from "@/lib/export/schema";
import type { MinutaResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT } from "@/lib/http/status";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";
import { minutaUpdateSchema } from "@/lib/minutas/schema";

type Context = RouteContext<"/api/minutas/[id]">;

/** A saved minuta with its drafting report, as the result panel shows it. */
export const GET = defineRoute({}, async ({ user }, ctx: Context) => {
  const minuta = getMinutaRepository().get((await ctx.params).id, user.id);
  if (!minuta) return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
  return Response.json({ ...minuta.result, id: minuta.id } satisfies MinutaResponseBody);
});

/** Saves a reviewed version of the minuta's text. */
export const PUT = defineRoute(
  { body: minutaUpdateSchema, maxBodyBytes: MAX_MARKDOWN_BODY_BYTES },
  async ({ user, body }, ctx: Context) => {
    if (!getMinutaRepository().updateMarkdown((await ctx.params).id, user.id, body.markdown)) {
      return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
    }
    return new Response(null, { status: HTTP_NO_CONTENT });
  },
);

export const DELETE = defineRoute({}, async ({ user }, ctx: Context) => {
  if (!getMinutaRepository().delete((await ctx.params).id, user.id)) {
    return errorResponse(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
  }
  return new Response(null, { status: HTTP_NO_CONTENT });
});
