import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ActiveSession } from "@/lib/auth/sessionRepository";

vi.mock("server-only", () => ({}));
const readSession = vi.fn<() => Promise<ActiveSession | null>>();
vi.mock("@/lib/auth/session", () => ({ readSession: () => readSession() }));
const isUnlocked = vi.fn<(userId: string) => Promise<boolean>>();
vi.mock("@/lib/auth/pin", () => ({ isUnlocked: (userId: string) => isUnlocked(userId) }));

const { defineRoute } = await import("./route");

const MEMBER: ActiveSession = {
  id: "session-1",
  lastSeenAt: "2026-09-27T12:00:00Z",
  user: { id: "u1", username: "ana", displayName: "Ana", role: "member", createdAt: "", disabledAt: null, hasPin: false },
};

function request(init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Request {
  const { method = "POST", headers = {}, body = '{"name":"Ana"}' } = init;
  return new Request("http://localhost:3000/api/teste", {
    method,
    headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json", ...headers },
    body: method === "GET" ? undefined : body,
  });
}

const echo = defineRoute({ body: z.object({ name: z.string() }), maxBodyBytes: 100 }, ({ user, body }) =>
  Response.json({ user: user.id, name: body.name }),
);
const adminOnly = defineRoute({ access: "admin" }, () => new Response(null, { status: 204 }));
const sensitive = defineRoute({ sensitive: true }, () => new Response(null, { status: 204 }));

describe("defineRoute", () => {
  beforeEach(() => {
    readSession.mockReset();
    readSession.mockResolvedValue(MEMBER);
  });

  it("runs the handler for a signed-in user with a valid same-origin JSON body", async () => {
    const response = await echo(request(), undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: "u1", name: "Ana" });
  });

  it("answers 401 without a session and 403 for a member on an admin route", async () => {
    readSession.mockResolvedValueOnce(null);
    expect((await echo(request(), undefined)).status).toBe(401);
    expect((await adminOnly(request(), undefined)).status).toBe(403);
  });

  it("blocks cross-site requests, unknown hosts, non-JSON bodies and oversized bodies", async () => {
    expect((await echo(request({ headers: { origin: "http://evil.test" } }), undefined)).status).toBe(403);
    expect((await echo(request({ headers: { host: "attacker.test" } }), undefined)).status).toBe(421);
    expect((await echo(request({ headers: { "content-type": "text/plain" } }), undefined)).status).toBe(415);
    expect((await echo(request({ body: JSON.stringify({ name: "x".repeat(200) }) }), undefined)).status).toBe(413);
    const invalid = await echo(request({ body: '{"name":1}' }), undefined);
    expect(invalid.status).toBe(400);
  });

  it("checks the host and origin before the session", async () => {
    readSession.mockResolvedValue(null);
    expect((await echo(request({ headers: { origin: "http://evil.test" } }), undefined)).status).toBe(403);
    expect(readSession).not.toHaveBeenCalled();
  });

  it("answers 403 for a sensitive route while the PIN is locked and 204 once unlocked", async () => {
    isUnlocked.mockReset();
    isUnlocked.mockResolvedValue(false);
    expect((await sensitive(request(), undefined)).status).toBe(403);
    expect(isUnlocked).toHaveBeenCalledWith("u1");
    isUnlocked.mockResolvedValue(true);
    expect((await sensitive(request(), undefined)).status).toBe(204);
  });

  it("never asks for the PIN unlock on routes that are not sensitive", async () => {
    isUnlocked.mockReset();
    expect((await echo(request(), undefined)).status).toBe(200);
    expect(isUnlocked).not.toHaveBeenCalled();
  });
});
