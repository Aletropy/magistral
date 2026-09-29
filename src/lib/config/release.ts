import type { EnvVars } from "./envVars";

/** Set to "teste" on the published test server: the app then shows a "Versão de teste" badge. */
export const RELEASE_CHANNEL_ENV_VAR = "MAGISTRAL_RELEASE_CHANNEL";
export const TEST_CHANNEL = "teste";

export interface ReleaseInfo {
  /** From package.json, inlined at build time. */
  version: string;
  /** The git commit the image was built from, when the build passed one. */
  commit: string | null;
  isTestRelease: boolean;
}

const COMMIT_LENGTH = 7;

export function getReleaseInfo(env: EnvVars = process.env): ReleaseInfo {
  const commit = process.env.NEXT_PUBLIC_MAGISTRAL_COMMIT?.trim();
  return {
    version: process.env.NEXT_PUBLIC_MAGISTRAL_VERSION ?? "0.0.0",
    commit: commit ? commit.slice(0, COMMIT_LENGTH) : null,
    isTestRelease: env[RELEASE_CHANNEL_ENV_VAR]?.trim().toLowerCase() === TEST_CHANNEL,
  };
}

/** "0.2.0 (4a8a477)" for the account menu and the health check. */
export function formatVersion({ version, commit }: ReleaseInfo): string {
  return commit ? `${version} (${commit})` : version;
}
