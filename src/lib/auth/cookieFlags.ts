/** Browsers only send a `Secure` cookie over HTTPS, so it is set only when the app is served that way. */
export function isHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  return (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https";
}
