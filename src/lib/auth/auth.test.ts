import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { DatabaseSync } from "node:sqlite";
import { LOGIN_LOCKOUT_MS, MAX_FAILED_LOGINS, createLoginThrottle } from "./loginThrottle";
import { hashPassword, verifyPassword } from "./passwords";
import { isSafeNextPath, loginPath } from "./paths";
import { createSessionRepository, type SessionRepository } from "./sessionRepository";
import { sessionIdOf } from "./sessionToken";
import { UsernameTakenError, createUserRepository, type UserRepository } from "./userRepository";

const HOUR_MS = 60 * 60 * 1000;

describe("passwords", () => {
  it("verifies the right password only, and never a malformed hash", async () => {
    const hash = await hashPassword("frase longa e secreta");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("frase longa e secreta", hash)).toBe(true);
    expect(await verifyPassword("frase longa e secreta!", hash)).toBe(false);
    expect(await verifyPassword("qualquer", "md5$abc")).toBe(false);
    expect(await hashPassword("frase longa e secreta")).not.toBe(hash);
  });
});

describe("user repository", () => {
  let db: DatabaseSync;
  let users: UserRepository;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY_DATABASE);
    users = createUserRepository(db);
  });

  it("creates the first admin once and hands them the records written before accounts existed", () => {
    db.exec(`INSERT INTO minutas (id, title, persona_name, document_type_label, request, result, markdown)
             VALUES ('m1', 'Antiga', 'Moderno', 'NDA', '{}', '{}', '# Antiga')`);
    const admin = users.createFirstAdmin({ username: "Ana", displayName: "Ana", passwordHash: "x" });

    expect(admin).toMatchObject({ username: "Ana", role: "admin" });
    expect(db.prepare("SELECT owner_id FROM minutas").get()).toEqual({ owner_id: admin!.id });
    expect(users.createFirstAdmin({ username: "bruno", displayName: "Bruno", passwordHash: "x" })).toBeNull();
    expect(users.count()).toBe(1);
  });

  it("finds credentials ignoring case and refuses a taken username", () => {
    users.create({ username: "ana", displayName: "Ana", passwordHash: "hash", role: "member" });
    expect(users.findCredentials(" ANA ")).toMatchObject({ passwordHash: "hash", user: { username: "ana" } });
    expect(() => users.create({ username: "Ana", displayName: "Outra", passwordHash: "x", role: "member" })).toThrow(
      UsernameTakenError,
    );
  });

  it("counts active admins and disables accounts", () => {
    const admin = users.create({ username: "ana", displayName: "Ana", passwordHash: "x", role: "admin" });
    expect(users.countActiveAdmins()).toBe(1);
    expect(users.update(admin.id, { disabledAt: new Date() })?.disabledAt).not.toBeNull();
    expect(users.countActiveAdmins()).toBe(0);
    expect(users.update(admin.id, { disabledAt: null, role: "member" })).toMatchObject({ disabledAt: null, role: "member" });
  });
});

describe("session repository", () => {
  let users: UserRepository;
  let sessions: SessionRepository;
  let userId: string;
  const now = new Date("2026-09-27T12:00:00Z");

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    users = createUserRepository(db);
    sessions = createSessionRepository(db);
    userId = users.create({ username: "ana", displayName: "Ana", passwordHash: "x", role: "member" }).id;
  });

  function open(token: string, ttlMs = HOUR_MS) {
    sessions.create({ id: sessionIdOf(token), userId, expiresAt: new Date(now.getTime() + ttlMs), userAgent: null, now });
  }

  it("finds an unexpired session of an enabled user by the token's hash", () => {
    open("token-a");
    expect(sessions.findActive(sessionIdOf("token-a"), now)?.user.id).toBe(userId);
    expect(sessions.findActive("token-a", now)).toBeNull();
    expect(sessions.findActive(sessionIdOf("token-a"), new Date(now.getTime() + 2 * HOUR_MS))).toBeNull();

    users.update(userId, { disabledAt: now });
    expect(sessions.findActive(sessionIdOf("token-a"), now)).toBeNull();
  });

  it("extends a session and ends every other session of a user", () => {
    open("token-a");
    open("token-b");
    sessions.touch(sessionIdOf("token-a"), new Date(now.getTime() + 3 * HOUR_MS), now);
    expect(sessions.findActive(sessionIdOf("token-a"), new Date(now.getTime() + 2 * HOUR_MS))).not.toBeNull();

    expect(sessions.deleteForUser(userId, sessionIdOf("token-a"))).toBe(1);
    expect(sessions.findActive(sessionIdOf("token-b"), now)).toBeNull();
    expect(sessions.purgeExpired(new Date(now.getTime() + 4 * HOUR_MS))).toBe(1);
  });
});

describe("login throttle", () => {
  it("locks an account after repeated failures, then lets it try again", () => {
    const throttle = createLoginThrottle();
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt++) throttle.recordFailure("ana", 0);
    expect(throttle.isLocked("ana", 1)).toBe(true);
    expect(throttle.isLocked("bruno", 1)).toBe(false);
    expect(throttle.isLocked("ana", LOGIN_LOCKOUT_MS + 1)).toBe(false);

    throttle.recordFailure("ana", LOGIN_LOCKOUT_MS + 1);
    expect(throttle.isLocked("ana", LOGIN_LOCKOUT_MS + 2)).toBe(false);
    throttle.recordSuccess("ana");
    expect(throttle.isLocked("ana", LOGIN_LOCKOUT_MS + 2)).toBe(false);
  });
});

describe("login redirects", () => {
  it("only returns to paths inside the app", () => {
    expect(isSafeNextPath("/historico?x=1")).toBe(true);
    expect(isSafeNextPath("//evil.test")).toBe(false);
    expect(isSafeNextPath("/\\evil.test")).toBe(false);
    expect(isSafeNextPath("https://evil.test")).toBe(false);
    expect(loginPath("/lotes")).toBe("/entrar?proximo=%2Flotes");
    expect(loginPath("//evil.test")).toBe("/entrar");
  });
});
