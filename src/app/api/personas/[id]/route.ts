import {
  HTTP_CONFLICT,
  HTTP_NOT_FOUND,
  HTTP_NO_CONTENT,
  errorResponse,
  parseJsonBody,
  type PersonaResponseBody,
} from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { BUILTIN_PERSONA_DELETE_MESSAGE, PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { personaInputSchema } from "@/lib/personas/schema";

export async function PUT(request: Request, ctx: RouteContext<"/api/personas/[id]">): Promise<Response> {
  const parsed = await parseJsonBody(request, personaInputSchema);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;

  try {
    const persona = getPersonaRepository().update(id, parsed.data);
    if (!persona) return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
    return Response.json({ persona } satisfies PersonaResponseBody);
  } catch (error) {
    console.error("[api/personas] update failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/personas/[id]">): Promise<Response> {
  const { id } = await ctx.params;

  try {
    const result = getPersonaRepository().delete(id);
    if (result === "not_found") return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
    if (result === "builtin") return errorResponse(HTTP_CONFLICT, BUILTIN_PERSONA_DELETE_MESSAGE);
    return new Response(null, { status: HTTP_NO_CONTENT });
  } catch (error) {
    console.error("[api/personas] delete failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
