import "server-only";
import { getDb } from "@/lib/db/client";
import { createMinutaRepository, type MinutaRepository } from "./repository";

export function getMinutaRepository(): MinutaRepository {
  return createMinutaRepository(getDb());
}
