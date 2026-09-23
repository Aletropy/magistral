import "server-only";
import { getClauseRepository } from "@/lib/clauses/getClauseRepository";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { LIBRARY_SOURCE_KIND_LABELS } from "@/lib/rag/types";
import type { AppData } from "./buildChatPrompt";

/** The names the assistant may recommend: the user's personas, approved clauses and library documents. */
export function loadAppData(): AppData {
  return {
    personas: getPersonaRepository()
      .list()
      .map(({ name, description }) => ({ name, description })),
    clauses: getClauseRepository()
      .list()
      .map(({ title, category }) => ({ title, category })),
    librarySources: getLibraryRepository()
      .listSources()
      .map((source) => ({ title: source.title, kind: LIBRARY_SOURCE_KIND_LABELS[source.kind] })),
  };
}
