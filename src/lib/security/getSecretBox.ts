import "server-only";
import { MIN_SECRET_KEY_CHARS, SECRET_KEY_ENV_VAR } from "@/lib/config/checkEnvironment";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_SERVICE_UNAVAILABLE } from "@/lib/http/status";
import { createSecretBox, type SecretBox } from "./secretBox";

const MISSING_KEY_MESSAGE = `Defina ${SECRET_KEY_ENV_VAR} (${MIN_SECRET_KEY_CHARS} caracteres ou mais) nas configurações do servidor e reinicie para usar integrações.`;

/** The box sealing integration secrets; without a strong enough key, integrations are unavailable. */
export function getSecretBox(): SecretBox {
  const secret = process.env[SECRET_KEY_ENV_VAR]?.trim() ?? "";
  if (secret.length < MIN_SECRET_KEY_CHARS) throw new AppError(HTTP_SERVICE_UNAVAILABLE, MISSING_KEY_MESSAGE);
  return createSecretBox(secret);
}
