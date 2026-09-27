import type { DatabaseSync } from "node:sqlite";
import type { UserRole } from "./types";
import { createUserRepository } from "./userRepository";

/** Adds a user for repository tests (owned rows need a real user); the password hash is never checked. */
export function insertTestUser(db: DatabaseSync, username = "ana", role: UserRole = "member"): string {
  return createUserRepository(db).create({ username, displayName: username, passwordHash: "x", role }).id;
}
