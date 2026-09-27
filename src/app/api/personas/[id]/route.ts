import type { PersonaResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_NO_CONTENT } from "@/lib/http/status";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { BUILTIN_PERSONA_DELETE_MESSAGE, PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { personaInputSchema } from "@/lib/personas/schema";

type Context = RouteContext<"/api/personas/[id]">;

export const PUT = defineRoute({ body: personaInputSchema }, async ({ body }, ctx: Context) => {
  const persona = getPersonaRepository().update((await ctx.params).id, body);
  if (!persona) return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
  return Response.json({ persona } satisfies PersonaResponseBody);
});

/** Removing a shared persona affects the whole office, so only admins can. */
export const DELETE = defineRoute({ access: "admin" }, async (_input, ctx: Context) => {
  const result = getPersonaRepository().delete((await ctx.params).id);
  if (result === "not_found") return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
  if (result === "builtin") return errorResponse(HTTP_CONFLICT, BUILTIN_PERSONA_DELETE_MESSAGE);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
