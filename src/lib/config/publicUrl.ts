/** The address testers and OAuth providers use to reach the app, e.g. "https://magistral.duckdns.org". */
export const PUBLIC_URL_ENV_VAR = "MAGISTRAL_PUBLIC_URL";

/** The configured public URL without a trailing slash, or null when the app only runs locally. */
export function resolvePublicUrl(value: string | undefined = process.env[PUBLIC_URL_ENV_VAR]): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return null;
  }
}
