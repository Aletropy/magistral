import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, PRIVACY_PATH, SETUP_PATH, loginPath } from "@/lib/auth/paths";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { UNLOCK_COOKIE_NAMES } from "@/lib/auth/pinCookies";
import { allowedHostsFromEnv, isAllowedHost } from "@/lib/http/allowedHosts";
import { NONCE_HEADER, contentSecurityPolicy } from "@/lib/http/contentSecurityPolicy";

const HTTP_UNAUTHORIZED = 401;
const HTTP_MISDIRECTED_REQUEST = 421;
const API_PREFIX = "/api/";
/** Reachable without a session: the sign-in and first-setup pages and the endpoints they call. */
const PUBLIC_PATHS = new Set([
  LOGIN_PATH,
  SETUP_PATH,
  PRIVACY_PATH,
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup",
  "/api/health",
]);
const NOT_SIGNED_IN_BODY = { error: "Sua sessão expirou. Entre novamente para continuar." };

function isUnlockCookie(segment: string): boolean {
  const name = segment.split("=", 1)[0];
  return UNLOCK_COOKIE_NAMES.includes(name);
}

/**
 * A PIN unlock only lasts while navigating inside the app: full page loads (first visit, reload,
 * back/forward) ask for the PIN again. Client-side navigations fetch over `cors`, full loads use
 * `navigate`; browsers without the header are treated as full loads.
 */
function isFullPageLoad(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(API_PREFIX)) return false;
  return request.headers.get("sec-fetch-mode") !== "cors";
}

/**
 * Runs before every page and API request. It only does cheap checks: the Host header (DNS rebinding),
 * whether a session cookie is present (the database check happens in each page and route), and the
 * per-request CSP nonce.
 */
export function proxy(request: NextRequest): NextResponse {
  if (!isAllowedHost(request.headers.get("host"), allowedHostsFromEnv())) {
    return new NextResponse("Endereço não reconhecido por este servidor.", { status: HTTP_MISDIRECTED_REQUEST });
  }

  const { pathname, search } = request.nextUrl;
  if (!PUBLIC_PATHS.has(pathname) && !request.cookies.has(SESSION_COOKIE_NAME)) {
    if (pathname.startsWith(API_PREFIX)) return NextResponse.json(NOT_SIGNED_IN_BODY, { status: HTTP_UNAUTHORIZED });
    return NextResponse.redirect(new URL(loginPath(`${pathname}${search}`), request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(request.headers);
  headers.set(NONCE_HEADER, nonce);
  headers.set("Content-Security-Policy", policy);
  const sentUnlock = UNLOCK_COOKIE_NAMES.filter((name) => request.cookies.has(name));
  if (sentUnlock.length > 0 && isFullPageLoad(request)) {
    const kept = (headers.get("cookie") ?? "")
      .split(";")
      .map((segment) => segment.trim())
      .filter((segment) => segment && !isUnlockCookie(segment));
    if (kept.length > 0) headers.set("cookie", kept.join("; "));
    else headers.delete("cookie");
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  if (sentUnlock.length > 0 && isFullPageLoad(request)) {
    for (const name of sentUnlock) response.cookies.delete(name);
  }
  return response;
}

export const config = {
  // Static build output and the favicon need neither a session nor a nonce.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
