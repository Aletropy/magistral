import "server-only";
import { getDb } from "@/lib/db/client";
import { getSecretBox } from "@/lib/security/getSecretBox";
import { createIntegrationRepository, type IntegrationRepository } from "./repository";

export function getIntegrationRepository(): IntegrationRepository {
  return createIntegrationRepository(getDb(), getSecretBox());
}
