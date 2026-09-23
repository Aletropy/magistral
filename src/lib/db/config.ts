import path from "node:path";

export const DATA_DIR_ENV_VAR = "MAGISTRAL_DATA_DIR";
export const DEFAULT_DATA_DIR = "data";
export const DATABASE_FILE_NAME = "magistral.db";

/** Absolute path of MAGISTRAL_DATA_DIR (default ./data), where the database and downloaded models live. */
export function resolveDataDir(dataDir: string | undefined = process.env[DATA_DIR_ENV_VAR]): string {
  // User data read at runtime: keep Turbopack from tracing it into the build output.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), dataDir || DEFAULT_DATA_DIR);
}

/** Absolute path of the SQLite file, inside the data dir. */
export function resolveDatabasePath(dataDir: string | undefined = process.env[DATA_DIR_ENV_VAR]): string {
  return path.join(resolveDataDir(dataDir), DATABASE_FILE_NAME);
}
