import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** OWASP's recommended scrypt parameters (N=2^17, r=8, p=1). */
const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
/** scrypt needs 128 * N * r bytes (128 MB here), above Node's 32 MB default. */
const SCRYPT_MAX_MEMORY_BYTES = 256 * 1024 * 1024;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const HASH_SCHEME = "scrypt";
const FIELD_SEPARATOR = "$";

function deriveKey(password: string, salt: Buffer, options: ScryptOptions, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Hashes a password as "scrypt$N$r$p$salt$key" (base64 salt and key). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const options = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAX_MEMORY_BYTES };
  const key = await deriveKey(password, salt, options, KEY_BYTES);
  return [HASH_SCHEME, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), key.toString("base64")].join(
    FIELD_SEPARATOR,
  );
}

/** Checks a password against a stored hash in constant time; false for malformed hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split(FIELD_SEPARATOR);
  if (scheme !== HASH_SCHEME || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAX_MEMORY_BYTES };
  if (!Number.isInteger(options.N) || !Number.isInteger(options.r) || !Number.isInteger(options.p)) return false;
  const actual = await deriveKey(password, Buffer.from(salt, "base64"), options, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
