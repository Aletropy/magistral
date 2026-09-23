import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "./config";
import { openDatabase } from "./openDatabase";

/** Kept on globalThis so dev-server hot reloads reuse one connection instead of leaking new ones. */
const globalForDb = globalThis as typeof globalThis & { magistralDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  globalForDb.magistralDb ??= openDatabase(resolveDatabasePath());
  return globalForDb.magistralDb;
}
