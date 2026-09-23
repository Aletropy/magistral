import {
  HTTP_BAD_REQUEST,
  errorResponse,
  parseJsonBody,
  type MinutaResponseBody,
} from "@/lib/http/api";
import { generateMinuta } from "@/lib/llm/generateMinuta";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { getMinutaGenerator } from "@/lib/llm/getMinutaGenerator";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { findNegativeConstraintViolations } from "@/lib/personas/findNegativeConstraintViolations";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { buildRetrievalQuery } from "@/lib/prompt/buildUserPrompt";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { EMPTY_LIBRARY_MESSAGE } from "@/lib/rag/messages";
import { selectLibraryContext, type LibraryContext } from "@/lib/rag/selectContext";

/** Long contracts with thinking enabled can take minutes to draft. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const persona = getPersonaRepository().get(parsed.data.persona);
    if (!persona) return errorResponse(HTTP_BAD_REQUEST, PERSONA_NOT_FOUND_MESSAGE);

    let library: LibraryContext | null = null;
    if (parsed.data.useLibrary) {
      library = await selectLibraryContext(getLibraryRepository(), getEmbedder(), buildRetrievalQuery(parsed.data));
      if (library.sources.length === 0) return errorResponse(HTTP_BAD_REQUEST, EMPTY_LIBRARY_MESSAGE);
    }

    const sources = library?.sources ?? [];
    const markdown = await generateMinuta(getMinutaGenerator("minuta"), parsed.data, persona, sources);
    return Response.json({
      markdown,
      forbiddenTermsFound: findNegativeConstraintViolations(markdown, persona.negativeConstraints),
      consultedSources: sources.map(({ ref, title, label }) => ({ ref, title, label })),
      retrievalStrategy: library?.strategy ?? null,
    } satisfies MinutaResponseBody);
  } catch (error) {
    console.error("[api/minuta] generation failed", error);
    const { status, message } = toErrorResponseInfo(error);
    return errorResponse(status, message);
  }
}
