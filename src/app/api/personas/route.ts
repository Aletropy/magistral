import { HTTP_CREATED, type PersonaResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { personaInputSchema } from "@/lib/personas/schema";

/** Personas are shared by the whole office; any user can add one. */
export const POST = defineRoute({ body: personaInputSchema }, ({ body }) => {
  const persona = getPersonaRepository().create(body);
  return Response.json({ persona } satisfies PersonaResponseBody, { status: HTTP_CREATED });
});
