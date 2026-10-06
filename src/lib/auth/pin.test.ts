import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "./config";
import { UNLOCK_COOKIE_NAME } from "./pinCookies";

vi.mock("server-only", () => ({}));

const getPinHash = vi.fn<(id: string) => string | null>();
vi.mock("./getAuthRepositories", () => ({
  getUserRepository: () => ({ getPinHash: (id: string) => getPinHash(id) }),
}));

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
}));

const { isUnlocked, setUnlock } = await import("./pin");

const USER_ID = "u1";
const PIN_HASH = "$scrypt$salt$hash";
const REQUEST = new Request("http://localhost:3000/api/system/unlock");

beforeEach(() => {
  cookieJar.clear();
  getPinHash.mockReset();
});

describe("isUnlocked", () => {
  it("is always open while the account has no PIN", async () => {
    getPinHash.mockReturnValue(null);
    expect(await isUnlocked(USER_ID)).toBe(true);
    expect(cookieJar.has(UNLOCK_COOKIE_NAME)).toBe(false);
  });

  it("is closed with a PIN until the browser unlocks", async () => {
    getPinHash.mockReturnValue(PIN_HASH);
    expect(await isUnlocked(USER_ID)).toBe(false);

    cookieJar.set(SESSION_COOKIE_NAME, "session-token-a");
    await setUnlock(REQUEST, USER_ID);
    expect(await isUnlocked(USER_ID)).toBe(true);
  });

  it("re-locks when the session changes, even with the old unlock cookie", async () => {
    getPinHash.mockReturnValue(PIN_HASH);
    cookieJar.set(SESSION_COOKIE_NAME, "session-token-a");
    await setUnlock(REQUEST, USER_ID);

    cookieJar.set(SESSION_COOKIE_NAME, "session-token-b");
    expect(await isUnlocked(USER_ID)).toBe(false);
  });

  it("re-locks when the PIN changes, even with the old unlock cookie", async () => {
    getPinHash.mockReturnValue(PIN_HASH);
    cookieJar.set(SESSION_COOKIE_NAME, "session-token-a");
    await setUnlock(REQUEST, USER_ID);
    expect(await isUnlocked(USER_ID)).toBe(true);

    getPinHash.mockReturnValue("$scrypt$othervalue");
    expect(await isUnlocked(USER_ID)).toBe(false);
  });

  it("does not unlock without a session to bind the cookie to", async () => {
    getPinHash.mockReturnValue(PIN_HASH);
    await setUnlock(REQUEST, USER_ID);
    expect(cookieJar.has(UNLOCK_COOKIE_NAME)).toBe(false);
    expect(await isUnlocked(USER_ID)).toBe(false);
  });
});
