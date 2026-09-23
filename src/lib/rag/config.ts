import path from "node:path";
import { DATA_DIR_ENV_VAR, DEFAULT_DATA_DIR } from "@/lib/db/config";

export const LIBRARY_DIR_ENV_VAR = "MAGISTRAL_LIBRARY_DIR";
export const DEFAULT_LIBRARY_SUBDIR = "biblioteca";

/** The folder "Sincronizar pasta" mirrors: MAGISTRAL_LIBRARY_DIR, or <data dir>/biblioteca. */
export function resolveLibraryDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured =
    env[LIBRARY_DIR_ENV_VAR] || path.join(env[DATA_DIR_ENV_VAR] || DEFAULT_DATA_DIR, DEFAULT_LIBRARY_SUBDIR);
  // The folder is user data read at runtime, so keep Turbopack from tracing it into the build output.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}
