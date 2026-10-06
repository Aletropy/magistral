import "server-only";
import { cookies } from "next/headers";
import {
  MAX_USER_AGENT_CHARS,
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_INTERVAL_MS,
  SESSION_TTL_MS,
} from "./config";
import { getSessionRepository } from "./getAuthRepositories";
import { clearSystemUnlock } from "../systemPin";
import type { ActiveSession } from "./sessionRepository";
import { newSessionToken, sessionIdOf } from "./sessionToken";

/** Browsers only send a `Secure` cookie over HTTPS, so it is set only when the app is served that way. */
function isHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  return (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https";
}

/** Signs the user in on this browser: stores a new session and sets its cookie. */
export async function startSession(request: Request, userId: string): Promise<void> {
  const token = newSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  getSessionRepository().create({
    id: sessionIdOf(token),
    userId,
    expiresAt,
    userAgent: request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_CHARS) ?? null,
    now,
  });
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    expires: expiresAt,
  });
}

/** Signs out of this browser. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (token) getSessionRepository().delete(sessionIdOf(token));
  jar.delete(SESSION_COOKIE_NAME);
  await clearSystemUnlock();
}

/**
 * The session in this request's cookie, or null. Activity extends it (at most every few minutes); the
 * cookie keeps its original expiry, which is fine because the database decides whether it is still valid.
 */
export async function readSession(): Promise<ActiveSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const sessions = getSessionRepository();
  const now = new Date();
  const session = sessions.findActive(sessionIdOf(token), now);
  if (!session) return null;
  if (now.getTime() - Date.parse(session.lastSeenAt) > SESSION_REFRESH_INTERVAL_MS) {
    sessions.touch(session.id, new Date(now.getTime() + SESSION_TTL_MS), now);
  }
  return session;
}
