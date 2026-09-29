import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { SecretBox } from "@/lib/security/secretBox";

/** One outside service's connection, with its secrets already opened. */
export interface IntegrationRecord {
  provider: string;
  redirectUri: string | null;
  clientInformation: unknown;
  tokens: unknown;
  codeVerifier: string | null;
  oauthState: string | null;
  connectedBy: string | null;
  connectedByName: string | null;
  connectedAt: string | null;
  lastError: string | null;
  /** A secret couldn't be opened (MAGISTRAL_SECRET_KEY changed); the connection must be made again. */
  unreadable: boolean;
}

/** Fields that can change during the authorization; undefined leaves one as it is, null clears it. */
export interface IntegrationPatch {
  redirectUri?: string | null;
  clientInformation?: unknown;
  tokens?: unknown;
  codeVerifier?: string | null;
  oauthState?: string | null;
  lastError?: string | null;
}

export interface IntegrationRepository {
  get(provider: string): IntegrationRecord | null;
  /** Creates the row on first use. */
  update(provider: string, patch: IntegrationPatch): void;
  /** Tokens were saved: records who connected, and drops what the authorization no longer needs. */
  markConnected(provider: string, userId: string): void;
  delete(provider: string): boolean;
}

const rowSchema = z.object({
  provider: z.string(),
  redirect_uri: z.string().nullable(),
  client_information: z.string().nullable(),
  tokens: z.string().nullable(),
  code_verifier: z.string().nullable(),
  oauth_state: z.string().nullable(),
  connected_by: z.string().nullable(),
  connected_by_name: z.string().nullable(),
  connected_at: z.string().nullable(),
  last_error: z.string().nullable(),
});

/** Plain columns are written as given; sealed ones go through the box (objects as JSON). */
const PLAIN_COLUMNS = { redirectUri: "redirect_uri", oauthState: "oauth_state", lastError: "last_error" } as const;
const SEALED_JSON_COLUMNS = { clientInformation: "client_information", tokens: "tokens" } as const;

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export function createIntegrationRepository(db: DatabaseSync, box: SecretBox): IntegrationRepository {
  const select = db.prepare(
    `SELECT i.provider, i.redirect_uri, i.client_information, i.tokens, i.code_verifier, i.oauth_state,
       i.connected_by, u.display_name AS connected_by_name, i.connected_at, i.last_error
     FROM integrations i LEFT JOIN users u ON u.id = i.connected_by WHERE i.provider = ?`,
  );
  const ensureRow = db.prepare("INSERT OR IGNORE INTO integrations (provider) VALUES (?)");
  const connected = db.prepare(
    `UPDATE integrations SET connected_by = ?, connected_at = ${NOW}, oauth_state = NULL, code_verifier = NULL,
       last_error = NULL, updated_at = ${NOW} WHERE provider = ?`,
  );
  const remove = db.prepare("DELETE FROM integrations WHERE provider = ?");

  function setColumn(provider: string, column: string, value: string | null) {
    // Column names come from the constant maps above, never from input.
    db.prepare(`UPDATE integrations SET ${column} = ?, updated_at = ${NOW} WHERE provider = ?`).run(value, provider);
  }

  return {
    get(provider) {
      const row = select.get(provider);
      if (!row) return null;
      const parsed = rowSchema.parse(row);
      let unreadable = false;
      const open = (sealed: string | null) => {
        if (sealed === null) return null;
        try {
          return box.open(sealed);
        } catch {
          unreadable = true;
          return null;
        }
      };
      const openJson = (sealed: string | null): unknown => {
        const text = open(sealed);
        return text === null ? null : (JSON.parse(text) as unknown);
      };
      return {
        provider: parsed.provider,
        redirectUri: parsed.redirect_uri,
        clientInformation: openJson(parsed.client_information),
        tokens: openJson(parsed.tokens),
        codeVerifier: open(parsed.code_verifier),
        oauthState: parsed.oauth_state,
        connectedBy: parsed.connected_by,
        connectedByName: parsed.connected_by_name,
        connectedAt: parsed.connected_at,
        lastError: parsed.last_error,
        unreadable,
      };
    },

    update(provider, patch) {
      ensureRow.run(provider);
      for (const [field, column] of Object.entries(PLAIN_COLUMNS)) {
        const value = patch[field as keyof typeof PLAIN_COLUMNS];
        if (value !== undefined) setColumn(provider, column, value);
      }
      for (const [field, column] of Object.entries(SEALED_JSON_COLUMNS)) {
        const value = patch[field as keyof typeof SEALED_JSON_COLUMNS];
        if (value !== undefined) setColumn(provider, column, value === null ? null : box.seal(JSON.stringify(value)));
      }
      if (patch.codeVerifier !== undefined) {
        setColumn(provider, "code_verifier", patch.codeVerifier === null ? null : box.seal(patch.codeVerifier));
      }
    },

    markConnected: (provider, userId) => void connected.run(userId, provider),
    delete: (provider) => remove.run(provider).changes > 0,
  };
}
