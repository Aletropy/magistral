/**
 * The page's Content-Security-Policy. Scripts need the per-request nonce (Next.js adds it to its own
 * scripts); inline style attributes stay allowed because the UI libraries render them. Development also
 * needs eval (React's debugging) and the hot-reload websocket.
 */
export function contentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** The request header the proxy passes the nonce in, for the root layout's inline theme script. */
export const NONCE_HEADER = "x-nonce";
