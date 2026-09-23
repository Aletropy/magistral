import "server-only";
import type { ClauseOption } from "@/lib/clauses/types";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { toPersonaSummary } from "@/lib/personas/toPersonaSummary";
import type { PersonaSummary } from "@/lib/personas/types";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";

export interface MinutaFormOptions {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
}

/** What the minuta form needs from the database; shared by the home page and the batch creator. */
export function loadMinutaFormOptions(): MinutaFormOptions {
  return {
    personas: getPersonaRepository().list().map(toPersonaSummary),
    clauses: getClauseRepository()
      .list()
      .map(({ id, title, category, documentTypes, body }) => ({ id, title, category, documentTypes, body })),
    librarySourceCount: getLibraryRepository().listSources().length,
  };
}
