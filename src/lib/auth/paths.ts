export const LOGIN_PATH = "/entrar";
export const SETUP_PATH = "/configurar";
export const TEAM_PATH = "/equipe";
export const ACCOUNT_PATH = "/conta";
/** Query parameter of the login page: where to go after signing in. */
export const NEXT_PATH_PARAM = "proximo";

/** The login page, returning to `next` afterwards when it is a path inside the app. */
export function loginPath(next?: string | null): string {
  return next && isSafeNextPath(next) ? `${LOGIN_PATH}?${NEXT_PATH_PARAM}=${encodeURIComponent(next)}` : LOGIN_PATH;
}

/** Only same-app paths are followed after login, never another site ("//evil.test" or "https://…"). */
export function isSafeNextPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}
