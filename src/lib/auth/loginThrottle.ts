/**
 * Failed logins allowed per account before it is locked out for a while. The key is the username alone:
 * the client address can't be trusted (a client can send any X-Forwarded-For), and per-account limits
 * are what stop password guessing.
 */
export const MAX_FAILED_LOGINS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

interface Attempts {
  failures: number;
  lockedUntil: number;
}

export interface LoginThrottle {
  isLocked(key: string, now: number): boolean;
  recordFailure(key: string, now: number): void;
  recordSuccess(key: string): void;
}

/** Past this many tracked accounts, entries that aren't locked are forgotten, so memory stays bounded. */
const MAX_TRACKED_KEYS = 10_000;

/** In memory: a restart clears it, which is acceptable for one office server. */
export function createLoginThrottle(): LoginThrottle {
  const attempts = new Map<string, Attempts>();
  function forgetUnlocked(now: number): void {
    for (const [key, entry] of attempts) if (entry.lockedUntil <= now) attempts.delete(key);
  }
  return {
    isLocked: (key, now) => (attempts.get(key)?.lockedUntil ?? 0) > now,
    recordFailure(key, now) {
      if (attempts.size >= MAX_TRACKED_KEYS) forgetUnlocked(now);
      const entry = attempts.get(key);
      const lockExpired = entry !== undefined && entry.lockedUntil !== 0 && entry.lockedUntil <= now;
      const failures = (lockExpired ? 0 : (entry?.failures ?? 0)) + 1;
      attempts.set(key, { failures, lockedUntil: failures >= MAX_FAILED_LOGINS ? now + LOGIN_LOCKOUT_MS : 0 });
    },
    recordSuccess: (key) => void attempts.delete(key),
  };
}

const globalForThrottle = globalThis as typeof globalThis & { magistralLoginThrottle?: LoginThrottle };

export function getLoginThrottle(): LoginThrottle {
  globalForThrottle.magistralLoginThrottle ??= createLoginThrottle();
  return globalForThrottle.magistralLoginThrottle;
}

export function throttleKey(username: string): string {
  return username.trim().toLowerCase();
}
