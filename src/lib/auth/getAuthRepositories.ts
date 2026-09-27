import "server-only";
import { getDb } from "@/lib/db/client";
import { createSessionRepository, type SessionRepository } from "./sessionRepository";
import { createUserRepository, type UserRepository } from "./userRepository";

export function getUserRepository(): UserRepository {
  return createUserRepository(getDb());
}

export function getSessionRepository(): SessionRepository {
  return createSessionRepository(getDb());
}
