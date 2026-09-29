import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createSecretBox } from "@/lib/security/secretBox";
import { createIntegrationRepository, type IntegrationRepository } from "./repository";

const KEY = "uma-chave-secreta-com-mais-de-32-caracteres";
const TOKENS = { access_token: "acesso-secreto", refresh_token: "renovacao", token_type: "Bearer" };

describe("createIntegrationRepository", () => {
  let db: ReturnType<typeof openDatabase>;
  let integrations: IntegrationRepository;
  let admin: string;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY_DATABASE);
    admin = insertTestUser(db, "ana");
    integrations = createIntegrationRepository(db, createSecretBox(KEY));
  });

  it("keeps tokens and the verifier sealed in the database and opens them on read", () => {
    integrations.update("jurisprudencias", { tokens: TOKENS, codeVerifier: "verificador", oauthState: "estado" });

    const raw = db.prepare("SELECT tokens, code_verifier, oauth_state FROM integrations").get() as Record<string, string>;
    expect(raw.tokens).not.toContain("acesso-secreto");
    expect(raw.code_verifier).not.toContain("verificador");
    expect(integrations.get("jurisprudencias")).toMatchObject({ tokens: TOKENS, codeVerifier: "verificador", oauthState: "estado", unreadable: false });
  });

  it("records who connected and clears what the authorization no longer needs", () => {
    integrations.update("jurisprudencias", { tokens: TOKENS, codeVerifier: "v", oauthState: "s", lastError: "falhou" });
    integrations.markConnected("jurisprudencias", admin);
    expect(integrations.get("jurisprudencias")).toMatchObject({
      connectedBy: admin,
      connectedByName: "ana",
      codeVerifier: null,
      oauthState: null,
      lastError: null,
      connectedAt: expect.any(String),
    });
    expect(integrations.delete("jurisprudencias")).toBe(true);
    expect(integrations.get("jurisprudencias")).toBeNull();
  });

  it("reports secrets sealed with another key as unreadable", () => {
    integrations.update("jurisprudencias", { tokens: TOKENS });
    const withOtherKey = createIntegrationRepository(db, createSecretBox(`${KEY}-nova`));
    expect(withOtherKey.get("jurisprudencias")).toMatchObject({ tokens: null, unreadable: true });
  });
});
