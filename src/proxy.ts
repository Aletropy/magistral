import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, SETUP_PATH, loginPath } from "@/lib/auth/paths";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { ALLOWED_HOSTS_ENV_VAR, configuredHosts, isAllowedHost } from "@/lib/http/allowedHosts";
import { NONCE_HEADER, contentSecurityPolicy } from "@/lib/http/contentSecurityPolicy";

const HTTP_UNAUTHORIZED = 401;
const HTTP_MISDIRECTED_REQUEST = 421;
const API_PREFIX = "/api/";
/** Reachable without a session: the sign-in and first-setup pages and the endpoints they call. */
const PUBLIC_PATHS = new Set([LOGIN_PATH, SETUP_PATH, "/api/auth/login", "/api/auth/logout", "/api/auth/setup"]);
const NOT_SIGNED_IN_BODY = { error: "Sua sessão expirou. Entre novamente para continuar." };

/**
 * Runs before every page and API request. It only does cheap checks: the Host header (DNS rebinding),
 * whether a session cookie is present (the database check happens in each page and route), and the
 * per-request CSP nonce.
 */
export function proxy(request: NextRequest): NextResponse {
  if (!isAllowedHost(request.headers.get("host"), configuredHosts(process.env[ALLOWED_HOSTS_ENV_VAR]))) {
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
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Static build output and the favicon need neither a session nor a nonce.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
