import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createSecretBox } from "@/lib/security/secretBox";
import { createIntegrationRepository, type IntegrationRepository } from "../repository";
import { JURISPRUDENCIAS_MCP_URL, JURISPRUDENCIAS_PROVIDER } from "./config";
import { createJurisprudenciasAuthProvider } from "./oauthProvider";

const REDIRECT = "https://magistral.example.com/api/integrations/jurisprudencias/callback";
const ISSUER = "https://jurisprudencias.ai";

/** Jurisprudências.ai as its metadata describes it, recording the requests it gets. */
function fakeServer() {
  const requests: { url: string; body: string }[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchFn = async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input.toString());
    const body = typeof init?.body === "string" ? init.body : init?.body ? String(init.body) : "";
    requests.push({ url: url.toString(), body });
    if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) {
      return json({ resource: JURISPRUDENCIAS_MCP_URL, authorization_servers: [ISSUER], scopes_supported: ["mcp"] });
    }
    if (url.pathname === "/.well-known/oauth-authorization-server") {
      return json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/oauth/authorize`,
        token_endpoint: `${ISSUER}/oauth/token`,
        registration_endpoint: `${ISSUER}/oauth/clients`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
        scopes_supported: ["mcp"],
      });
    }
    if (url.pathname === "/oauth/clients") return json({ client_id: "cliente-1", redirect_uris: [REDIRECT] }, 201);
    if (url.pathname === "/oauth/token") {
      return json({ access_token: "acesso", refresh_token: "renovacao", token_type: "Bearer", expires_in: 3600 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetchFn, requests };
}

describe("createJurisprudenciasAuthProvider", () => {
  let integrations: IntegrationRepository;

  beforeEach(() => {
    integrations = createIntegrationRepository(openDatabase(IN_MEMORY_DATABASE), createSecretBox("k".repeat(40)));
  });

  it("registers the client, sends the admin to authorize with PKCE and state, then saves the tokens", async () => {
    const server = fakeServer();
    const provider = createJurisprudenciasAuthProvider({ integrations, redirectUrl: REDIRECT, randomState: () => "estado-1" });

    await expect(auth(provider, { serverUrl: JURISPRUDENCIAS_MCP_URL, fetchFn: server.fetchFn })).resolves.toBe("REDIRECT");
    const authorization = provider.authorizationUrl()!;
    expect(`${authorization.origin}${authorization.pathname}`).toBe(`${ISSUER}/oauth/authorize`);
    expect(authorization.searchParams.get("client_id")).toBe("cliente-1");
    expect(authorization.searchParams.get("redirect_uri")).toBe(REDIRECT);
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("state")).toBe("estado-1");
    const saved = integrations.get(JURISPRUDENCIAS_PROVIDER)!;
    expect(saved).toMatchObject({ oauthState: "estado-1", redirectUri: REDIRECT, codeVerifier: expect.any(String) });

    const callback = createJurisprudenciasAuthProvider({ integrations, redirectUrl: REDIRECT });
    await expect(
      auth(callback, { serverUrl: JURISPRUDENCIAS_MCP_URL, authorizationCode: "codigo", fetchFn: server.fetchFn }),
    ).resolves.toBe("AUTHORIZED");
    expect(integrations.get(JURISPRUDENCIAS_PROVIDER)!.tokens).toMatchObject({ access_token: "acesso", refresh_token: "renovacao" });
    const tokenRequest = server.requests.find((request) => request.url.endsWith("/oauth/token"))!;
    const form = new URLSearchParams(tokenRequest.body);
    expect(form.get("code")).toBe("codigo");
    expect(form.get("code_verifier")).toBe(saved.codeVerifier);
  });

  it("registers again when the callback address changed", async () => {
    const server = fakeServer();
    await auth(createJurisprudenciasAuthProvider({ integrations, redirectUrl: REDIRECT }), {
      serverUrl: JURISPRUDENCIAS_MCP_URL,
      fetchFn: server.fetchFn,
    });
    const moved = createJurisprudenciasAuthProvider({ integrations, redirectUrl: "http://localhost:3000/api/integrations/jurisprudencias/callback" });
    expect(moved.clientInformation()).toBeUndefined();
  });
});
