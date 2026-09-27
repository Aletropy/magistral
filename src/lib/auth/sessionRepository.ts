import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { USER_ROLES, type User } from "./types";

const sessionRowSchema = z.object({
  session_id: z.string(),
  last_seen_at: z.string(),
  id: z.string(),
  username: z.string(),
  display_name: z.string(),
  role: z.enum(USER_ROLES),
  created_at: z.string(),
  disabled_at: z.string().nullable(),
});

export interface ActiveSession {
  id: string;
  lastSeenAt: string;
  user: User;
}

export interface NewSession {
  /** SHA-256 of the cookie token; the token itself is never stored. */
  id: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  now: Date;
}

export interface SessionRepository {
  create(session: NewSession): void;
  /** The unexpired session with this id, with its user, when the user is still enabled. */
  findActive(id: string, now: Date): ActiveSession | null;
  /** Extends the session after activity. */
  touch(id: string, expiresAt: Date, now: Date): void;
  delete(id: string): void;
  /** Ends every session of a user, e.g. when they are disabled or their password changes. */
  deleteForUser(userId: string, exceptId?: string): number;
  purgeExpired(now: Date): number;
}

export function createSessionRepository(db: DatabaseSync): SessionRepository {
  const insert = db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, last_seen_at, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const selectActive = db.prepare(
    `SELECT s.id AS session_id, s.last_seen_at, u.id, u.username, u.display_name, u.role, u.created_at, u.disabled_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ? AND u.disabled_at IS NULL`,
  );
  const updateSeen = db.prepare("UPDATE sessions SET expires_at = ?, last_seen_at = ? WHERE id = ?");
  const deleteOne = db.prepare("DELETE FROM sessions WHERE id = ?");
  const deleteUserSessions = db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?");
  const deleteExpired = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");

  return {
    create({ id, userId, expiresAt, userAgent, now }) {
      const at = now.toISOString();
      insert.run(id, userId, expiresAt.toISOString(), at, userAgent, at);
    },
    findActive(id, now) {
      const row = selectActive.get(id, now.toISOString());
      if (!row) return null;
      const parsed = sessionRowSchema.parse(row);
      return {
        id: parsed.session_id,
        lastSeenAt: parsed.last_seen_at,
        user: {
          id: parsed.id,
          username: parsed.username,
          displayName: parsed.display_name,
          role: parsed.role,
          createdAt: parsed.created_at,
          disabledAt: parsed.disabled_at,
        },
      };
    },
    touch: (id, expiresAt, now) => void updateSeen.run(expiresAt.toISOString(), now.toISOString(), id),
    delete: (id) => void deleteOne.run(id),
    deleteForUser: (userId, exceptId = "") => Number(deleteUserSessions.run(userId, exceptId).changes),
    purgeExpired: (now) => Number(deleteExpired.run(now.toISOString()).changes),
  };
}
