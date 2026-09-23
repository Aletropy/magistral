import "server-only";
import { getDb } from "@/lib/db/client";
import { createLibraryRepository, type LibraryRepository } from "./repository";

export function getLibraryRepository(): LibraryRepository {
  return createLibraryRepository(getDb());
}
