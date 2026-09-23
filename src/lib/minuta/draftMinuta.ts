import "server-only";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { isApprovedClauseOrderKept } from "@/lib/clauses/locateClauseSections";
import { APPROVED_CLAUSE_MISSING_MESSAGE } from "@/lib/clauses/messages";
import type { DraftResult } from "@/lib/http/api";
import { generateMinuta } from "@/lib/llm/generateMinuta";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { getMinutaGenerator } from "@/lib/llm/getMinutaGenerator";
import { findNegativeConstraintViolations } from "@/lib/personas/findNegativeConstraintViolations";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { PERSONA_NOT_FOUND_MESSAGE } from "@/lib/personas/messages";
import { buildRetrievalQuery } from "@/lib/prompt/buildUserPrompt";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { EMPTY_LIBRARY_MESSAGE } from "@/lib/rag/messages";
import { selectLibraryContext, type LibraryContext } from "@/lib/rag/selectContext";
import type { LlmOperation } from "@/lib/usage/types";
import { MinutaRequestError } from "./errors";
import type { MinutaRequest } from "./schema";

export interface DraftedMinuta {
  result: DraftResult;
  /** Kept with the saved minuta so the history still names it after the persona is renamed or deleted. */
  personaName: string;
}

/**
 * Drafts one minuta end to end: loads the persona and approved clauses, retrieves library sources when
 * asked, calls the model and runs the output checks. Used by the form route and the batch worker.
 */
export async function draftMinuta(request: MinutaRequest, operation: LlmOperation): Promise<DraftedMinuta> {
  const persona = getPersonaRepository().get(request.persona);
  if (!persona) throw new MinutaRequestError(PERSONA_NOT_FOUND_MESSAGE);

  const approvedClauses = getClauseRepository().getMany(request.approvedClauseIds);
  if (approvedClauses.length !== request.approvedClauseIds.length) {
    throw new MinutaRequestError(APPROVED_CLAUSE_MISSING_MESSAGE);
  }

  let library: LibraryContext | null = null;
  if (request.useLibrary) {
    library = await selectLibraryContext(getLibraryRepository(), getEmbedder(), buildRetrievalQuery(request));
    if (library.sources.length === 0) throw new MinutaRequestError(EMPTY_LIBRARY_MESSAGE);
  }

  const sources = library?.sources ?? [];
  const markdown = await generateMinuta(getMinutaGenerator(operation), request, persona, { sources, approvedClauses });
  const result: DraftResult = {
    markdown,
    forbiddenTermsFound: findNegativeConstraintViolations(markdown, persona.negativeConstraints),
    consultedSources: sources.map(({ ref, title, label }) => ({ ref, title, label })),
    retrievalStrategy: library?.strategy ?? null,
    approvedClauseOrderKept: isApprovedClauseOrderKept(
      markdown,
      approvedClauses.map((clause) => clause.title),
    ),
    approvedClauses: approvedClauses.map(({ title, body }) => ({ title, body })),
  };
  return { result, personaName: persona.name };
}
