import type { PlaygroundResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND } from "@/lib/http/status";
import { getMinutaGenerator } from "@/lib/llm/getMinutaGenerator";
import { findNegativeConstraintViolations } from "@/lib/personas/findNegativeConstraintViolations";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { rewriteSample } from "@/lib/playground/rewriteSample";
import { playgroundRequestSchema } from "@/lib/playground/schema";

export const POST = defineRoute({ body: playgroundRequestSchema }, async ({ body: { personaId, draft, sampleText } }) => {
  const persona = getPersonaRepository().get(personaId);
  if (!persona) return errorResponse(HTTP_NOT_FOUND, PERSONA_NOT_FOUND_MESSAGE);
  const style = { ...draft, examples: persona.examples, styleProfile: persona.styleProfile };
  const markdown = await rewriteSample(getMinutaGenerator("playground"), style, draft.temperature, sampleText);
  const forbiddenTermsFound = findNegativeConstraintViolations(markdown, draft.negativeConstraints);
  return Response.json({ markdown, forbiddenTermsFound } satisfies PlaygroundResponseBody);
});
