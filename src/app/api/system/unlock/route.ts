import { z } from "zod";
import { getLoginThrottle } from "@/lib/auth/loginThrottle";
import { AppError } from "@/lib/errors/AppError";
import { defineRoute } from "@/lib/http/route";
import { HTTP_FORBIDDEN, HTTP_NO_CONTENT, HTTP_TOO_MANY_REQUESTS } from "@/lib/http/status";
import { setSystemUnlock, verifySystemPin } from "@/lib/systemPin";

const UnlockBody = z.object({ pin: z.string().regex(/^\d{4}$/, "Informe os 4 dígitos do PIN.") });

const WRONG_PIN_MESSAGE = "PIN incorreto. Tente novamente.";
const PIN_LOCKED_MESSAGE = "Muitas tentativas com o PIN. Aguarde 15 minutos e tente de novo.";

/**
 * Unlocks the Sistema section on this browser when the office PIN matches. Guessing is
 * throttled per user, and the unlock only works for the current session.
 */
export const POST = defineRoute({ body: UnlockBody }, async ({ body, request, user, sessionId }) => {
  const throttle = getLoginThrottle();
  const key = `system-pin:${user.id}`;
  const now = Date.now();
  if (throttle.isLocked(key, now)) throw new AppError(HTTP_TOO_MANY_REQUESTS, PIN_LOCKED_MESSAGE);
  if (!verifySystemPin(body.pin)) {
    throttle.recordFailure(key, now);
    throw new AppError(HTTP_FORBIDDEN, WRONG_PIN_MESSAGE);
  }
  throttle.recordSuccess(key);
  const forwarded = request.headers.get("x-forwarded-proto");
  await setSystemUnlock(sessionId, (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https");
  return new Response(null, { status: HTTP_NO_CONTENT });
});
