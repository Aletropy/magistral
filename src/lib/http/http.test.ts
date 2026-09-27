import { describe, expect, it } from "vitest";
import { configuredHosts, isAllowedHost } from "./allowedHosts";
import { HttpError } from "./HttpError";
import { readBodyBytes, readJsonBody } from "./readBody";
import { isSameOriginRequest } from "./sameOrigin";

const URL_BASE = "http://localhost:3000/api/x";

function post(headers: Record<string, string>, body = "{}"): Request {
  return new Request(URL_BASE, { method: "POST", headers, body });
}

describe("isAllowedHost", () => {
  it("accepts localhost, IP addresses, .local names and configured hosts only", () => {
    const extra = configuredHosts("magistral.escritorio, Outro.Nome:8080");
    expect(isAllowedHost("localhost:3000", extra)).toBe(true);
    expect(isAllowedHost("192.168.1.6:3000", extra)).toBe(true);
    expect(isAllowedHost("[::1]:3000", extra)).toBe(true);
    expect(isAllowedHost("servidor.local", extra)).toBe(true);
    expect(isAllowedHost("MAGISTRAL.escritorio", extra)).toBe(true);
    expect(isAllowedHost("outro.nome", extra)).toBe(true);
    expect(isAllowedHost("attacker.test", extra)).toBe(false);
    expect(isAllowedHost(null, extra)).toBe(false);
  });
});

describe("isSameOriginRequest", () => {
  it("rejects cross-site writes and allows same-origin ones and non-browser clients", () => {
    expect(isSameOriginRequest(post({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
    expect(isSameOriginRequest(post({ host: "localhost:3000", origin: "http://evil.test" }))).toBe(false);
    expect(isSameOriginRequest(post({ host: "localhost:3000", "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(post({ host: "localhost:3000" }))).toBe(true);
    expect(isSameOriginRequest(new Request(URL_BASE, { headers: { origin: "http://evil.test" } }))).toBe(true);
  });
});

describe("request bodies", () => {
  it("requires JSON and refuses bodies over the limit", async () => {
    await expect(readJsonBody(post({ "content-type": "application/json" }, '{"a":1}'), 100)).resolves.toEqual({ a: 1 });
    await expect(readJsonBody(post({ "content-type": "text/plain" }, "{}"), 100)).rejects.toMatchObject({ status: 415 });
    await expect(readJsonBody(post({ "content-type": "application/json" }, "{"), 100)).rejects.toMatchObject({ status: 400 });
    await expect(readBodyBytes(post({}, "x".repeat(101)), 100)).rejects.toBeInstanceOf(HttpError);
    await expect(readBodyBytes(post({ "content-length": "999999" }, "x"), 100)).rejects.toMatchObject({ status: 413 });
  });
});
