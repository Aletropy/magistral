import type { DatabaseSync } from "node:sqlite";

/** Runs `work` inside BEGIN/COMMIT, rolling back if it throws. */
export function withTransaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
