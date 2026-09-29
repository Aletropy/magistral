import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts secrets kept in the database (integration tokens) with AES-256-GCM. The key is derived from
 * MAGISTRAL_SECRET_KEY, so a copy of the database alone doesn't reveal them. Sealed values are
 * "v1.<iv>.<tag>.<ciphertext>" in base64url; a changed value or another key fails to open.
 */
const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = "v1";
const SEPARATOR = ".";
const IV_BYTES = 12;
const ENCODING = "base64url";

export interface SecretBox {
  seal(plaintext: string): string;
  /** Throws when the value was altered or sealed with another key. */
  open(sealed: string): string;
}

export class SecretBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretBoxError";
  }
}

export function createSecretBox(secret: string): SecretBox {
  const key = createHash("sha256").update(secret, "utf8").digest();

  return {
    seal(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return [FORMAT_VERSION, iv, cipher.getAuthTag(), ciphertext]
        .map((part) => (typeof part === "string" ? part : part.toString(ENCODING)))
        .join(SEPARATOR);
    },

    open(sealed) {
      const [version, iv, tag, ciphertext] = sealed.split(SEPARATOR);
      if (version !== FORMAT_VERSION || !iv || !tag || ciphertext === undefined) {
        throw new SecretBoxError("Unknown sealed value format.");
      }
      try {
        const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, ENCODING));
        decipher.setAuthTag(Buffer.from(tag, ENCODING));
        return Buffer.concat([decipher.update(Buffer.from(ciphertext, ENCODING)), decipher.final()]).toString("utf8");
      } catch {
        throw new SecretBoxError("The sealed value was altered or sealed with another key.");
      }
    },
  };
}
