"use client";

import { PERSONAS_ENDPOINT, personaEndpoint } from "@/lib/http/endpoints";
import type { PersonaInput } from "@/lib/personas/schema";
import { useResourceMutations } from "./useResourceMutations";

const ENDPOINTS = { collection: PERSONAS_ENDPOINT, item: personaEndpoint };
const MESSAGES = {
  saveFailed: "Não foi possível salvar a persona. Tente novamente.",
  deleteFailed: "Não foi possível excluir a persona. Tente novamente.",
};

export function usePersonaMutations() {
  return useResourceMutations<PersonaInput>(ENDPOINTS, MESSAGES);
}
