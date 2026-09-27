import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const SETUP_TOKEN_ENV_VAR = "MAGISTRAL_SETUP_TOKEN";
const SETUP_TOKEN_BYTES = 9;

const globalForSetup = globalThis as typeof globalThis & { magistralSetupToken?: string };

/**
 * The one-time code needed to create the first admin. It is printed in the server log, which only the
 * person who started the server can read, so nobody else on the network can claim the office first.
 */
export function getSetupToken(): string {
  globalForSetup.magistralSetupToken ??= process.env[SETUP_TOKEN_ENV_VAR] || randomBytes(SETUP_TOKEN_BYTES).toString("base64url");
  return globalForSetup.magistralSetupToken;
}

export function announceSetupToken(): void {
  console.warn(
    `[magistral] Nenhum usuário cadastrado. Abra /configurar e use o código de configuração: ${getSetupToken()}`,
  );
}

export function isValidSetupToken(candidate: string): boolean {
  const expected = Buffer.from(getSetupToken());
  const actual = Buffer.from(candidate.trim());
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
