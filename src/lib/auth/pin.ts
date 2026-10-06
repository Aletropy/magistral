import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./config";
import { isHttps } from "./cookieFlags";
import { getUserRepository } from "./getAuthRepositories";
import { UNLOCK_COOKIE_NAME } from "./pinCookies";

/** Part of the HMAC's message, so a different context yields a different marker. */
const UNLOCK_CONTEXT = "magistral-unlock";

/**
 * The unlock marker for this browser: keyed by the raw session token (an httpOnly cookie the page's
 * JavaScript can't read, so the marker can't be forged client-side) and bound to the current PIN's
 * hash, so changing or removing the PIN re-locks every open browser.
 */
function expectedUnlockToken(sessionToken: string, pinHash: string): string {
  return createHmac("sha256", sessionToken).update(`${UNLOCK_CONTEXT}:${pinHash}`).digest("base64url");
}

/** Compares two secrets without leaking their contents through timing. */
function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** The throttle key for this account's PIN attempts, reusing the login throttle's limits. */
export function unlockThrottleKey(userId: string): string {
  return `pin:${userId}`;
}

/**
 * Whether this account's locked areas are open on this browser: always true without a PIN, and
 * otherwise true only when the unlock cookie matches this session and the current PIN.
 */
export async function isUnlocked(userId: string): Promise<boolean> {
  const pinHash = getUserRepository().getPinHash(userId);
  if (pinHash === null) return true;
  const jar = await cookies();
  const sessionToken = jar.get(SESSION_COOKIE_NAME)?.value;
  const unlock = jar.get(UNLOCK_COOKIE_NAME)?.value;
  if (!sessionToken || !unlock) return false;
  return safeEquals(unlock, expectedUnlockToken(sessionToken, pinHash));
}

/** Opens this browser's locked areas after a correct PIN; called from the unlock route. */
export async function setUnlock(request: Request, userId: string): Promise<void> {
  const pinHash = getUserRepository().getPinHash(userId);
  if (pinHash === null) return;
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return;
  (await cookies()).set(UNLOCK_COOKIE_NAME, expectedUnlockToken(sessionToken, pinHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
  });
}
