import { randomBytes } from "node:crypto";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationFullSchema,
  OAuthTokensSchema,
  type OAuthClientInformationMixed,
  type OAuthClientMetadata,
  type OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { IntegrationRepository } from "../repository";
import { JURISPRUDENCIAS_OAUTH_SCOPE, JURISPRUDENCIAS_PROVIDER } from "./config";

const CLIENT_NAME = "Magistral";
const STATE_BYTES = 32;

export interface JurisprudenciasAuthProvider extends OAuthClientProvider {
  /** Where the admin must go to authorize, once `auth()` asked for it. */
  authorizationUrl(): URL | null;
}

export interface AuthProviderOptions {
  integrations: IntegrationRepository;
  /** This server's callback URL; the client registration is made for it and redone when it changes. */
  redirectUrl: string;
  randomState?: () => string;
}

/**
 * The MCP SDK's OAuth client for the office's Jurisprudências.ai account: a public client registered on
 * the first connection (dynamic registration), PKCE, and tokens kept sealed in the integrations table.
 * The SDK refreshes the access token with it when a call answers 401.
 */
export function createJurisprudenciasAuthProvider({
  integrations,
  redirectUrl,
  randomState = () => randomBytes(STATE_BYTES).toString("base64url"),
}: AuthProviderOptions): JurisprudenciasAuthProvider {
  let pendingAuthorization: URL | null = null;
  const record = () => integrations.get(JURISPRUDENCIAS_PROVIDER);
  const update = (patch: Parameters<IntegrationRepository["update"]>[1]) => integrations.update(JURISPRUDENCIAS_PROVIDER, patch);

  const clientMetadata: OAuthClientMetadata = {
    client_name: CLIENT_NAME,
    redirect_uris: [redirectUrl],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: JURISPRUDENCIAS_OAUTH_SCOPE,
  };

  return {
    get redirectUrl() {
      return redirectUrl;
    },
    get clientMetadata() {
      return clientMetadata;
    },

    state() {
      const state = randomState();
      update({ oauthState: state });
      return state;
    },

    clientInformation(): OAuthClientInformationMixed | undefined {
      const current = record();
      // A registration made for another address (e.g. before MAGISTRAL_PUBLIC_URL was set) can't be used.
      if (!current || current.redirectUri !== redirectUrl) return undefined;
      const parsed = OAuthClientInformationFullSchema.safeParse(current.clientInformation);
      return parsed.success ? parsed.data : undefined;
    },
    saveClientInformation(information) {
      update({ clientInformation: information, redirectUri: redirectUrl });
    },

    tokens(): OAuthTokens | undefined {
      const parsed = OAuthTokensSchema.safeParse(record()?.tokens);
      return parsed.success ? parsed.data : undefined;
    },
    saveTokens(tokens) {
      update({ tokens });
    },

    redirectToAuthorization(url) {
      pendingAuthorization = url;
    },
    authorizationUrl: () => pendingAuthorization,

    saveCodeVerifier(codeVerifier) {
      update({ codeVerifier });
    },
    codeVerifier() {
      const verifier = record()?.codeVerifier;
      if (!verifier) throw new Error("No PKCE code verifier saved for this authorization.");
      return verifier;
    },

    invalidateCredentials(scope) {
      if (scope === "all" || scope === "client") update({ clientInformation: null, redirectUri: null });
      if (scope === "all" || scope === "tokens") update({ tokens: null });
      if (scope === "all" || scope === "verifier") update({ codeVerifier: null });
    },
  };
}
