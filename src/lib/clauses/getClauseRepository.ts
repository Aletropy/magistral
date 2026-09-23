import "server-only";
import { getDb } from "@/lib/db/client";
import { createClauseRepository, type ClauseRepository } from "./repository";

export function getClauseRepository(): ClauseRepository {
  return createClauseRepository(getDb());
}
