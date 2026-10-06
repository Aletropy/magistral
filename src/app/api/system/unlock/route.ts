import { z } from "zod";
import { getUserRepository } from "@/lib/auth/getAuthRepositories";
import {
  NO_PIN_MESSAGE,
  PIN_LOCKED_MESSAGE,
  WRONG_PIN_MESSAGE,
} from "@/lib/auth/messages";
import { getLoginThrottle } from "@/lib/auth/loginThrottle";
import { verifyPassword } from "@/lib/auth/passwords";
import { setUnlock, unlockThrottleKey } from "@/lib/auth/pin";
import { AppError } from "@/lib/errors/AppError";
import { defineRoute } from "@/lib/http/route";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NO_CONTENT, HTTP_TOO_MANY_REQUESTS } from "@/lib/http/status";

/** Longer than any PIN the schema accepts, without reading a large body. */
const MAX_PIN_ATTEMPT_CHARS = 16;

const unlockSchema = z.object({
  pin: z.string().min(1, { error: "Informe o PIN." }).max(MAX_PIN_ATTEMPT_CHARS, { error: "PIN inválido." }),
});

/** Opens this browser's locked areas after the account's PIN matches; wrong attempts hit the login throttle. */
export const POST = defineRoute({ body: unlockSchema }, async ({ body, request, user }) => {
  const throttle = getLoginThrottle();
  const key = unlockThrottleKey(user.id);
  const now = Date.now();
  if (throttle.isLocked(key, now)) throw new AppError(HTTP_TOO_MANY_REQUESTS, PIN_LOCKED_MESSAGE);

  const pinHash = getUserRepository().getPinHash(user.id);
  if (pinHash === null) throw new AppError(HTTP_BAD_REQUEST, NO_PIN_MESSAGE);
  if (!(await verifyPassword(body.pin, pinHash))) {
    throttle.recordFailure(key, now);
    throw new AppError(HTTP_FORBIDDEN, WRONG_PIN_MESSAGE);
  }

  throttle.recordSuccess(key);
  await setUnlock(request, user.id);
  return new Response(null, { status: HTTP_NO_CONTENT });
});
