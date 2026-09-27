const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** Fetch metadata values a same-site page or a typed-in URL send; anything else came from another site. */
const TRUSTED_FETCH_SITES = new Set(["same-origin", "none"]);

/**
 * Blocks cross-site requests that change data (CSRF). Browsers always send Origin on such requests, and
 * Sec-Fetch-Site on modern ones; tools like curl send neither and can't carry a victim's cookie anyway.
 */
export function isSameOriginRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !TRUSTED_FETCH_SITES.has(fetchSite)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host.toLowerCase();
  } catch {
    return false;
  }
}
