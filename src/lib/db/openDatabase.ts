import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "./migrations";

export const IN_MEMORY_DATABASE = ":memory:";

/** Waits this long for a competing writer instead of failing with SQLITE_BUSY. */
const BUSY_TIMEOUT_MS = 5000;

/** Opens (creating if needed) the database at `location` and brings its schema up to date. */
export function openDatabase(location: string): DatabaseSync {
  if (location !== IN_MEMORY_DATABASE) mkdirSync(path.dirname(location), { recursive: true });

  const db = new DatabaseSync(location, { enableForeignKeyConstraints: true, timeout: BUSY_TIMEOUT_MS });
  db.exec("PRAGMA journal_mode = WAL");
  runMigrations(db);
  return db;
}
