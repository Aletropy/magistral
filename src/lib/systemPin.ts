import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./auth/config";
import { sessionIdOf } from "./auth/sessionToken";
import { SECRET_KEY_ENV_VAR } from "./config/checkEnvironment";
import { DESENVOLVIMENTO_PATH } from "./desenvolvimento/paths";
import { HOME_PATH } from "./minutas/paths";
import { DEV_UNLOCK_COOKIE_NAME, SYSTEM_UNLOCK_COOKIE_NAME, type PinScope } from "./pinCookies";

export interface PinConfig {
  envVar: string;
  cookieName: string;
  digits: number;
}

/** The Sistema section: four digits kept on the server, asked in the menu. */
export const SYSTEM_PIN: PinConfig = {
  envVar: "MAGISTRAL_SYSTEM_PIN",
  cookieName: SYSTEM_UNLOCK_COOKIE_NAME,
  digits: 4,
};

/** The Desenvolvimento section inside Sistema: its own six digits. */
export const DEV_PIN: PinConfig = {
  envVar: "MAGISTRAL_DEV_PIN",
  cookieName: DEV_UNLOCK_COOKIE_NAME,
  digits: 6,
};

export const PIN_BY_SCOPE: Record<PinScope, PinConfig> = { sistema: SYSTEM_PIN, desenvolvimento: DEV_PIN };

/** The configured PIN, or null when it isn't exactly the expected digits (then nothing is locked). */
export function readPin(config: PinConfig): string | null {
  const pin = process.env[config.envVar]?.trim() ?? "";
  return new RegExp(`^\\d{${config.digits}}$`).test(pin) ? pin : null;
}

export function isPinEnabled(config: PinConfig): boolean {
  return readPin(config) !== null;
}

function unlockKey(config: PinConfig): string {
  return process.env[SECRET_KEY_ENV_VAR]?.trim() || (readPin(config) ?? "");
}

/** Binds the unlock to the signed-in session, so signing out locks the sections again. */
function expectedUnlockToken(config: PinConfig, sessionId: string): string {
  return createHmac("sha256", unlockKey(config)).update(`pin-unlock:${config.cookieName}:${sessionId}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPin(config: PinConfig, pin: unknown): boolean {
  const expected = readPin(config);
  return expected !== null && typeof pin === "string" && safeEqual(pin, expected);
}

/** True when no PIN is configured or this browser unlocked the section in this session. */
export async function isPinUnlocked(config: PinConfig): Promise<boolean> {
  if (!isPinEnabled(config)) return true;
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE_NAME)?.value;
  const unlock = jar.get(config.cookieName)?.value;
  if (!sessionToken || !unlock) return false;
  return safeEqual(unlock, expectedUnlockToken(config, sessionIdOf(sessionToken)));
}

/** Remembers the unlock on this browser until it is closed, the session ends or the page reloads. */
export async function setPinUnlock(config: PinConfig, sessionId: string, secure: boolean): Promise<void> {
  if (!isPinEnabled(config)) return;
  (await cookies()).set(config.cookieName, expectedUnlockToken(config, sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
}

/** Forgets one unlock on this browser. */
export async function clearPinUnlock(config: PinConfig): Promise<void> {
  (await cookies()).delete(config.cookieName);
}

/** For Sistema pages: locked browsers go back to the dashboard. */
export async function requireSystemUnlock(): Promise<void> {
  if (!(await isPinUnlocked(SYSTEM_PIN))) redirect(HOME_PATH);
}

/** For Desenvolvimento pages (Uso, Integrações): locked browsers go back to the Desenvolvimento hub. */
export async function requireDevUnlock(): Promise<void> {
  if (!(await isPinUnlocked(DEV_PIN))) redirect(DESENVOLVIMENTO_PATH);
}
