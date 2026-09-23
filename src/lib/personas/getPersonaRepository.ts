import "server-only";
import { getDb } from "@/lib/db/client";
import { createPersonaRepository, type PersonaRepository } from "./repository";

export function getPersonaRepository(): PersonaRepository {
  return createPersonaRepository(getDb());
}
