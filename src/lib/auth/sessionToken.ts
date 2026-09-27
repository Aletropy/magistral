import { createHash, randomBytes } from "node:crypto";
import { SESSION_TOKEN_BYTES } from "./config";

/** A new random session token for the cookie. */
export function newSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/** The session's id in the database: a leaked database row can't be replayed as a cookie. */
export function sessionIdOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
