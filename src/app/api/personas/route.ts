import {
  HTTP_CREATED,
  errorResponse,
  parseJsonBody,
  type PersonaResponseBody,
} from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { personaInputSchema } from "@/lib/personas/schema";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, personaInputSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const persona = getPersonaRepository().create(parsed.data);
    return Response.json({ persona } satisfies PersonaResponseBody, { status: HTTP_CREATED });
  } catch (error) {
    console.error("[api/personas] create failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
