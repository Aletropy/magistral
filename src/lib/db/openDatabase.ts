import { chmodSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "./migrations";

export const IN_MEMORY_DATABASE = ":memory:";

/** Only the account running the server may read the data folder and the database (client documents live there). */
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

/** Waits this long for a competing writer instead of failing with SQLITE_BUSY. */
const BUSY_TIMEOUT_MS = 5000;

/** Opens (creating if needed) the database at `location` and brings its schema up to date. */
export function openDatabase(location: string): DatabaseSync {
  if (location !== IN_MEMORY_DATABASE) mkdirSync(path.dirname(location), { recursive: true, mode: PRIVATE_DIRECTORY_MODE });

  const db = new DatabaseSync(location, {
    enableForeignKeyConstraints: true,
    timeout: BUSY_TIMEOUT_MS,
    allowExtension: true,
  });
  // sqlite-vec provides the vec0 tables that hold the library's embeddings.
  sqliteVec.load(db);
  db.enableLoadExtension(false);
  db.exec("PRAGMA journal_mode = WAL");
  // SQLite gives the WAL and shared-memory files the database file's permissions.
  if (location !== IN_MEMORY_DATABASE) chmodSync(location, PRIVATE_FILE_MODE);
  runMigrations(db);
  return db;
}
