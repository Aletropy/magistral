import type { EnvVars } from "@/lib/config/envVars";
import { PUBLIC_URL_ENV_VAR, resolvePublicUrl } from "@/lib/config/publicUrl";

/**
 * Which Host headers the server answers. A DNS-rebinding page reaches the server under the attacker's
 * own hostname, so only names the office really uses are accepted: localhost, IP addresses, mDNS
 * ".local" names and whatever MAGISTRAL_ALLOWED_HOSTS lists (comma-separated, e.g. "magistral.escritorio").
 */
export const ALLOWED_HOSTS_ENV_VAR = "MAGISTRAL_ALLOWED_HOSTS";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const LOCAL_SUFFIXES = [".localhost", ".local"];
const LOCALHOST = "localhost";

/** "Example.com:3000" → "example.com"; "[::1]:3000" → "::1". */
export function hostnameOf(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) return trimmed.slice(1, trimmed.indexOf("]"));
  return trimmed.split(":")[0];
}

export function configuredHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((host) => hostnameOf(host))
    .filter(Boolean);
}

export function isAllowedHost(host: string | null, extraHosts: readonly string[]): boolean {
  if (!host) return false;
  const name = hostnameOf(host);
  if (!name) return false;
  if (name === LOCALHOST || IPV4.test(name) || name.includes(":")) return true;
  if (LOCAL_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  return extraHosts.includes(name);
}

/** Every extra hostname the server answers: MAGISTRAL_ALLOWED_HOSTS plus the host of MAGISTRAL_PUBLIC_URL. */
export function allowedHostsFromEnv(env: EnvVars = process.env): string[] {
  const publicUrl = resolvePublicUrl(env[PUBLIC_URL_ENV_VAR]);
  const extra = configuredHosts(env[ALLOWED_HOSTS_ENV_VAR]);
  return publicUrl ? [...extra, hostnameOf(new URL(publicUrl).host)] : extra;
}
