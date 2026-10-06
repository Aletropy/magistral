import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** The cookie the "browser" sends. */
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
}));

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));

const { DEV_PIN, SYSTEM_PIN, isPinEnabled, isPinUnlocked, readPin, setPinUnlock, verifyPin } = await import(
  "./systemPin"
);
const { SESSION_COOKIE_NAME } = await import("./auth/config");
const { newSessionToken, sessionIdOf } = await import("./auth/sessionToken");

const SYSTEM_ENV_VAR = "MAGISTRAL_SYSTEM_PIN";
const DEV_ENV_VAR = "MAGISTRAL_DEV_PIN";
const previousSystem = process.env[SYSTEM_ENV_VAR];
const previousDev = process.env[DEV_ENV_VAR];

beforeEach(() => {
  cookieJar.clear();
  if (previousSystem === undefined) delete process.env[SYSTEM_ENV_VAR];
  else process.env[SYSTEM_ENV_VAR] = previousSystem;
  if (previousDev === undefined) delete process.env[DEV_ENV_VAR];
  else process.env[DEV_ENV_VAR] = previousDev;
});

describe("readPin", () => {
  it("needs exactly the configured digits", () => {
    delete process.env[SYSTEM_ENV_VAR];
    expect(readPin(SYSTEM_PIN)).toBeNull();
    process.env[SYSTEM_ENV_VAR] = "123";
    expect(readPin(SYSTEM_PIN)).toBeNull();
    process.env[SYSTEM_ENV_VAR] = "5130";
    expect(readPin(SYSTEM_PIN)).toBe("5130");
    expect(isPinEnabled(SYSTEM_PIN)).toBe(true);
    process.env[DEV_ENV_VAR] = "258963";
    expect(readPin(DEV_PIN)).toBe("258963");
    process.env[DEV_ENV_VAR] = "25896";
    expect(readPin(DEV_PIN)).toBeNull();
  });

  it("verifies each PIN against its own value", () => {
    process.env[SYSTEM_ENV_VAR] = "5130";
    process.env[DEV_ENV_VAR] = "258963";
    expect(verifyPin(SYSTEM_PIN, "5130")).toBe(true);
    expect(verifyPin(SYSTEM_PIN, "258963")).toBe(false);
    expect(verifyPin(DEV_PIN, "258963")).toBe(true);
    expect(verifyPin(DEV_PIN, "5130")).toBe(false);
    expect(verifyPin(SYSTEM_PIN, 5130)).toBe(false);
  });
});

describe("isPinUnlocked", () => {
  it("stays unlocked without a PIN", async () => {
    delete process.env[SYSTEM_ENV_VAR];
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(true);
  });

  it("locks until the unlock cookie matches the session, per section", async () => {
    process.env[SYSTEM_ENV_VAR] = "5130";
    process.env[DEV_ENV_VAR] = "258963";
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(false);
    const token = newSessionToken();
    cookieJar.set(SESSION_COOKIE_NAME, token);
    await setPinUnlock(SYSTEM_PIN, sessionIdOf(token), false);
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(true);
    expect(await isPinUnlocked(DEV_PIN)).toBe(false);
    cookieJar.set("magistral_system_unlock", "adulterado");
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(false);
  });

  it("does not carry the unlock to another session", async () => {
    process.env[SYSTEM_ENV_VAR] = "5130";
    const first = newSessionToken();
    cookieJar.set(SESSION_COOKIE_NAME, first);
    await setPinUnlock(SYSTEM_PIN, sessionIdOf(first), false);
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(true);
    cookieJar.set(SESSION_COOKIE_NAME, newSessionToken());
    expect(await isPinUnlocked(SYSTEM_PIN)).toBe(false);
  });
});
