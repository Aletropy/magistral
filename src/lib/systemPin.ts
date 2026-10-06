import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./auth/config";
import { sessionIdOf } from "./auth/sessionToken";
import { SECRET_KEY_ENV_VAR } from "./config/checkEnvironment";
import { HOME_PATH } from "./minutas/paths";

/** A second gate for the Sistema section: four digits kept on the server, asked in the menu. */
export const SYSTEM_PIN_ENV_VAR = "MAGISTRAL_SYSTEM_PIN";
export const SYSTEM_UNLOCK_COOKIE_NAME = "magistral_system_unlock";

/** The configured PIN, or null when it isn't exactly four digits (then nothing is locked). */
export function systemPin(): string | null {
  const pin = process.env[SYSTEM_PIN_ENV_VAR]?.trim() ?? "";
  return /^\d{4}$/.test(pin) ? pin : null;
}

export function isSystemPinEnabled(): boolean {
  return systemPin() !== null;
}

function unlockKey(): string {
  return process.env[SECRET_KEY_ENV_VAR]?.trim() || (systemPin() ?? "");
}

/** Binds the unlock to the signed-in session, so signing out locks the section again. */
function expectedUnlockToken(sessionId: string): string {
  return createHmac("sha256", unlockKey()).update(`system-unlock:${sessionId}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifySystemPin(pin: unknown): boolean {
  const expected = systemPin();
  return expected !== null && typeof pin === "string" && safeEqual(pin, expected);
}

/** True when no PIN is configured or this browser unlocked the section in this session. */
export async function isSystemUnlocked(): Promise<boolean> {
  if (!isSystemPinEnabled()) return true;
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE_NAME)?.value;
  const unlock = jar.get(SYSTEM_UNLOCK_COOKIE_NAME)?.value;
  if (!sessionToken || !unlock) return false;
  return safeEqual(unlock, expectedUnlockToken(sessionIdOf(sessionToken)));
}

/** Remembers the unlock on this browser until it is closed or the session ends. */
export async function setSystemUnlock(sessionId: string, secure: boolean): Promise<void> {
  if (!isSystemPinEnabled()) return;
  (await cookies()).set(SYSTEM_UNLOCK_COOKIE_NAME, expectedUnlockToken(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
}

/** Forgets the unlock on this browser. */
export async function clearSystemUnlock(): Promise<void> {
  (await cookies()).delete(SYSTEM_UNLOCK_COOKIE_NAME);
}

/** For Sistema pages: locked browsers go back to the dashboard. */
export async function requireSystemUnlock(): Promise<void> {
  if (!(await isSystemUnlocked())) redirect(HOME_PATH);
}
