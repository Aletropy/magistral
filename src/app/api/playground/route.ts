import {
  HTTP_NOT_FOUND,
  errorResponse,
  parseJsonBody,
  type PlaygroundResponseBody,
} from "@/lib/http/api";
import { getMinutaGenerator } from "@/lib/llm/getMinutaGenerator";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { findNegativeConstraintViolations } from "@/lib/personas/findNegativeConstraintViolations";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { rewriteSample } from "@/lib/playground/rewriteSample";
import { playgroundRequestSchema } from "@/lib/playground/schema";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, playgroundRequestSchema);
  if ("response" in parsed) return parsed.response;
  const { personaId, draft, sampleText } = parsed.data;

  try {
    const persona = getPersonaRepository().get(personaId);
    if (!persona) return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);

    const style = { ...draft, examples: persona.examples, styleProfile: persona.styleProfile };
    const markdown = await rewriteSample(getMinutaGenerator("playground"), style, draft.temperature, sampleText);
    const forbiddenTermsFound = findNegativeConstraintViolations(markdown, draft.negativeConstraints);
    return Response.json({ markdown, forbiddenTermsFound } satisfies PlaygroundResponseBody);
  } catch (error) {
    console.error("[api/playground] rewrite failed", error);
    const { status, message } = toErrorResponseInfo(error);
    return errorResponse(status, message);
  }
}
