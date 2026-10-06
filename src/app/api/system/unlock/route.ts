import { z } from "zod";
import { getLoginThrottle } from "@/lib/auth/loginThrottle";
import { AppError } from "@/lib/errors/AppError";
import { defineRoute } from "@/lib/http/route";
import { HTTP_FORBIDDEN, HTTP_NO_CONTENT, HTTP_TOO_MANY_REQUESTS } from "@/lib/http/status";
import { PIN_BY_SCOPE, setPinUnlock, verifyPin } from "@/lib/systemPin";
import type { PinScope } from "@/lib/pinCookies";

const UnlockBody = z.object({
  scope: z.enum(["sistema", "desenvolvimento"]),
  pin: z.string().regex(/^\d{4,6}$/, "Informe os dígitos do PIN."),
});

const WRONG_PIN_MESSAGE = "PIN incorreto. Tente novamente.";
const PIN_LOCKED_MESSAGE = "Muitas tentativas com o PIN. Aguarde 15 minutos e tente de novo.";

/**
 * Unlocks a PIN-gated section on this browser when its PIN matches. Guessing is throttled per
 * user and section; the unlock only works for the current session and is forgotten on reload.
 */
export const POST = defineRoute({ body: UnlockBody }, async ({ body, request, user, sessionId }) => {
  const scope = body.scope as PinScope;
  const config = PIN_BY_SCOPE[scope];
  const throttle = getLoginThrottle();
  const key = `pin:${scope}:${user.id}`;
  const now = Date.now();
  if (throttle.isLocked(key, now)) throw new AppError(HTTP_TOO_MANY_REQUESTS, PIN_LOCKED_MESSAGE);
  if (!verifyPin(config, body.pin)) {
    throttle.recordFailure(key, now);
    throw new AppError(HTTP_FORBIDDEN, WRONG_PIN_MESSAGE);
  }
  throttle.recordSuccess(key);
  const forwarded = request.headers.get("x-forwarded-proto");
  await setPinUnlock(config, sessionId, (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https");
  return new Response(null, { status: HTTP_NO_CONTENT });
});
