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

const { isSystemPinEnabled, isSystemUnlocked, setSystemUnlock, systemPin, verifySystemPin } = await import(
  "./systemPin"
);
const { SESSION_COOKIE_NAME } = await import("./auth/config");
const { newSessionToken, sessionIdOf } = await import("./auth/sessionToken");

const PIN_ENV_VAR = "MAGISTRAL_SYSTEM_PIN";
const previousPin = process.env[PIN_ENV_VAR];

beforeEach(() => {
  cookieJar.clear();
  if (previousPin === undefined) delete process.env[PIN_ENV_VAR];
  else process.env[PIN_ENV_VAR] = previousPin;
});

describe("systemPin", () => {
  it("is disabled without four digits", () => {
    delete process.env[PIN_ENV_VAR];
    expect(systemPin()).toBeNull();
    expect(isSystemPinEnabled()).toBe(false);
    process.env[PIN_ENV_VAR] = "12";
    expect(systemPin()).toBeNull();
  });

  it("accepts a four-digit PIN and verifies it", () => {
    process.env[PIN_ENV_VAR] = "5130";
    expect(systemPin()).toBe("5130");
    expect(verifySystemPin("5130")).toBe(true);
    expect(verifySystemPin("0000")).toBe(false);
    expect(verifySystemPin("513")).toBe(false);
    expect(verifySystemPin(5130)).toBe(false);
  });

  it("stays unlocked without a PIN", async () => {
    delete process.env[PIN_ENV_VAR];
    expect(await isSystemUnlocked()).toBe(true);
  });

  it("locks until the unlock cookie matches the session", async () => {
    process.env[PIN_ENV_VAR] = "5130";
    expect(await isSystemUnlocked()).toBe(false);
    const token = newSessionToken();
    cookieJar.set(SESSION_COOKIE_NAME, token);
    expect(await isSystemUnlocked()).toBe(false);
    await setSystemUnlock(sessionIdOf(token), false);
    expect(await isSystemUnlocked()).toBe(true);
    cookieJar.set("magistral_system_unlock", "adulterado");
    expect(await isSystemUnlocked()).toBe(false);
  });

  it("does not carry the unlock to another session", async () => {
    process.env[PIN_ENV_VAR] = "5130";
    const first = newSessionToken();
    cookieJar.set(SESSION_COOKIE_NAME, first);
    await setSystemUnlock(sessionIdOf(first), false);
    expect(await isSystemUnlocked()).toBe(true);
    cookieJar.set(SESSION_COOKIE_NAME, newSessionToken());
    expect(await isSystemUnlocked()).toBe(false);
  });
});
