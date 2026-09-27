"use client";

import type { ClauseInput } from "@/lib/clauses/schema";
import { CLAUSES_ENDPOINT, clauseEndpoint } from "@/lib/http/endpoints";
import { useResourceMutations } from "./useResourceMutations";

const ENDPOINTS = { collection: CLAUSES_ENDPOINT, item: clauseEndpoint };
const MESSAGES = {
  saveFailed: "Não foi possível salvar a cláusula. Tente novamente.",
  deleteFailed: "Não foi possível excluir a cláusula. Tente novamente.",
};

export function useClauseMutations() {
  return useResourceMutations<ClauseInput>(ENDPOINTS, MESSAGES);
}
