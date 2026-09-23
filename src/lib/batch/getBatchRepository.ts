import "server-only";
import { getDb } from "@/lib/db/client";
import { createBatchRepository, type BatchRepository } from "./repository";

export function getBatchRepository(): BatchRepository {
  return createBatchRepository(getDb());
}
