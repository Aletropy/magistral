import type { DatabaseSync } from "node:sqlite";

/** Names the savepoint a nested transaction uses; SQLite allows the same name at every depth. */
const NESTED_SAVEPOINT = "magistral_nested";

/**
 * Runs `work` inside BEGIN/COMMIT, rolling back if it throws. Called inside another transaction it uses
 * a savepoint instead, so repositories that open their own transaction can run inside a caller's.
 */
export function withTransaction<T>(db: DatabaseSync, work: () => T): T {
  if (db.isTransaction) return withSavepoint(db, work);
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

function withSavepoint<T>(db: DatabaseSync, work: () => T): T {
  db.exec(`SAVEPOINT ${NESTED_SAVEPOINT}`);
  try {
    const result = work();
    db.exec(`RELEASE ${NESTED_SAVEPOINT}`);
    return result;
  } catch (error) {
    db.exec(`ROLLBACK TO ${NESTED_SAVEPOINT}`);
    db.exec(`RELEASE ${NESTED_SAVEPOINT}`);
    throw error;
  }
}
