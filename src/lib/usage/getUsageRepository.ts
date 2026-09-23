import "server-only";
import { getDb } from "@/lib/db/client";
import { createUsageRepository, type UsageRepository } from "./repository";

export function getUsageRepository(): UsageRepository {
  return createUsageRepository(getDb());
}
