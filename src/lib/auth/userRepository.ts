import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import { USER_ROLES, type User, type UserRole } from "./types";

const userRowSchema = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string(),
  role: z.enum(USER_ROLES),
  created_at: z.string(),
  disabled_at: z.string().nullable(),
});
const credentialsRowSchema = userRowSchema.extend({ password_hash: z.string() });
const countRowSchema = z.object({ count: z.number() });

/** Tables whose rows belong to a user; rows from before accounts existed have a NULL owner. */
const OWNED_TABLES = ["minutas", "chat_conversations", "batch_jobs", "tasks", "notifications"] as const;

export interface NewUser {
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserCredentials {
  user: User;
  passwordHash: string;
}

export interface UserChanges {
  displayName?: string;
  role?: UserRole;
  /** A date disables the user; null enables them again. */
  disabledAt?: Date | null;
}

export class UsernameTakenError extends Error {
  constructor() {
    super("Username already taken.");
    this.name = "UsernameTakenError";
  }
}

export interface UserRepository {
  count(): number;
  /** Active admins; the last one can't be disabled or demoted. */
  countActiveAdmins(): number;
  list(): User[];
  get(id: string): User | null;
  findCredentials(username: string): UserCredentials | null;
  /** Throws UsernameTakenError. */
  create(user: NewUser): User;
  /**
   * Creates the first admin and gives them every record written before accounts existed, in one step.
   * Returns null when a user already exists, so two setup attempts can't both succeed.
   */
  createFirstAdmin(user: Omit<NewUser, "role">): User | null;
  update(id: string, changes: UserChanges): User | null;
  setPasswordHash(id: string, passwordHash: string): boolean;
}

function toUser(row: unknown): User {
  const parsed = userRowSchema.parse(row);
  return {
    id: parsed.id,
    username: parsed.username,
    displayName: parsed.display_name,
    role: parsed.role,
    createdAt: parsed.created_at,
    disabledAt: parsed.disabled_at,
  };
}

const COLUMNS = "id, username, display_name, role, created_at, disabled_at";
const UNIQUE_CONSTRAINT = /UNIQUE constraint failed/;

export function createUserRepository(db: DatabaseSync): UserRepository {
  const countAll = db.prepare("SELECT COUNT(*) AS count FROM users");
  const countAdmins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND disabled_at IS NULL");
  const selectAll = db.prepare(`SELECT ${COLUMNS} FROM users ORDER BY disabled_at IS NOT NULL, display_name COLLATE NOCASE`);
  const selectOne = db.prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`);
  const selectCredentials = db.prepare(`SELECT ${COLUMNS}, password_hash FROM users WHERE username = ?`);
  const insert = db.prepare(
    "INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)",
  );
  const updatePassword = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
  const claimStatements = OWNED_TABLES.map((table) =>
    db.prepare(`UPDATE ${table} SET owner_id = ? WHERE owner_id IS NULL`),
  );
  const claimUsage = db.prepare("UPDATE llm_calls SET user_id = ? WHERE user_id IS NULL");

  function get(id: string): User | null {
    const row = selectOne.get(id);
    return row ? toUser(row) : null;
  }

  function insertUser({ username, displayName, passwordHash, role }: NewUser): User {
    const id = randomUUID();
    try {
      insert.run(id, username, displayName, passwordHash, role);
    } catch (error) {
      if (error instanceof Error && UNIQUE_CONSTRAINT.test(error.message)) throw new UsernameTakenError();
      throw error;
    }
    return get(id)!;
  }

  return {
    count: () => countRowSchema.parse(countAll.get()).count,
    countActiveAdmins: () => countRowSchema.parse(countAdmins.get()).count,
    list: () => selectAll.all().map(toUser),
    get,
    findCredentials(username) {
      const row = selectCredentials.get(username.trim());
      if (!row) return null;
      return { user: toUser(row), passwordHash: credentialsRowSchema.parse(row).password_hash };
    },
    create: insertUser,
    createFirstAdmin(user) {
      return withTransaction(db, () => {
        if (countRowSchema.parse(countAll.get()).count > 0) return null;
        const admin = insertUser({ ...user, role: "admin" });
        for (const claim of claimStatements) claim.run(admin.id);
        claimUsage.run(admin.id);
        return admin;
      });
    },
    update(id, { displayName, role, disabledAt }) {
      const assignments: string[] = [];
      const values: (string | null)[] = [];
      if (displayName !== undefined) {
        assignments.push("display_name = ?");
        values.push(displayName);
      }
      if (role !== undefined) {
        assignments.push("role = ?");
        values.push(role);
      }
      if (disabledAt !== undefined) {
        assignments.push("disabled_at = ?");
        values.push(disabledAt ? disabledAt.toISOString() : null);
      }
      if (assignments.length > 0) {
        db.prepare(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?`).run(...values, id);
      }
      return get(id);
    },
    setPasswordHash: (id, passwordHash) => updatePassword.run(passwordHash, id).changes > 0,
  };
}
