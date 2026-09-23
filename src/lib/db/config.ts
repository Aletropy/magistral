import path from "node:path";

export const DATA_DIR_ENV_VAR = "MAGISTRAL_DATA_DIR";
export const DEFAULT_DATA_DIR = "data";
export const DATABASE_FILE_NAME = "magistral.db";

/** Absolute path of the SQLite file, inside MAGISTRAL_DATA_DIR (default ./data). */
export function resolveDatabasePath(dataDir: string | undefined = process.env[DATA_DIR_ENV_VAR]): string {
  return path.resolve(dataDir || DEFAULT_DATA_DIR, DATABASE_FILE_NAME);
}
