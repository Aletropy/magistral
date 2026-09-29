import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

/** Where nightly copies of the database go; unset turns backups off. */
export const BACKUP_DIR_ENV_VAR = "MAGISTRAL_BACKUP_DIR";
/** One copy a day for a week. */
export const BACKUPS_KEPT = 7;

const BACKUP_PREFIX = "magistral-";
const BACKUP_SUFFIX = ".db";
const DAY_LENGTH = 10;
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

export interface BackupResult {
  /** The copy written now, or null when today's copy already existed. */
  written: string | null;
  removed: string[];
}

/**
 * Writes today's copy of the database with `VACUUM INTO` (a consistent snapshot while the app keeps
 * running) and deletes the oldest copies beyond `keep`. Copies are readable only by the server's account.
 */
export function backupDatabase(db: DatabaseSync, dir: string, now: Date, keep: number = BACKUPS_KEPT): BackupResult {
  mkdirSync(dir, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  const target = path.join(dir, `${BACKUP_PREFIX}${now.toISOString().slice(0, DAY_LENGTH)}${BACKUP_SUFFIX}`);
  let written: string | null = null;
  if (!existsSync(target)) {
    db.prepare("VACUUM INTO ?").run(target);
    chmodSync(target, PRIVATE_FILE_MODE);
    written = target;
  }
  const copies = readdirSync(dir)
    .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX))
    .sort();
  const removed = copies.slice(0, Math.max(0, copies.length - keep)).map((name) => path.join(dir, name));
  for (const file of removed) rmSync(file);
  return { written, removed };
}
