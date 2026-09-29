import { ANTHROPIC_API_KEY_ENV_VAR } from "@/lib/llm/anthropic/config";
import { EMBEDDING_PROVIDER_ENV_VAR, resolveEmbeddingProvider } from "@/lib/llm/embeddings";
import { GEMINI_API_KEY_ENV_VAR } from "@/lib/llm/gemini/config";
import { OPENROUTER_API_KEY_ENV_VAR } from "@/lib/llm/openrouter/config";
import { LLM_PROVIDERS, LLM_PROVIDER_ENV_VAR, type LlmProvider } from "@/lib/llm/providers";
import type { EnvVars } from "./envVars";
import { PUBLIC_URL_ENV_VAR, resolvePublicUrl } from "./publicUrl";

/** Encrypts integration credentials at rest; generate with `openssl rand -base64 48`. */
export const SECRET_KEY_ENV_VAR = "MAGISTRAL_SECRET_KEY";
export const MIN_SECRET_KEY_CHARS = 32;

const PROVIDER_KEYS: Record<LlmProvider, string> = {
  openrouter: OPENROUTER_API_KEY_ENV_VAR,
  gemini: GEMINI_API_KEY_ENV_VAR,
  anthropic: ANTHROPIC_API_KEY_ENV_VAR,
};

export interface EnvironmentReport {
  /** Problems that stop a production server from starting. */
  errors: string[];
  /** Problems worth a line in the log, e.g. a missing public URL on a local server. */
  warnings: string[];
}

function isSet(env: EnvVars, name: string): boolean {
  return Boolean(env[name]?.trim());
}

/**
 * Checks the settings the server needs before it accepts requests. In production every problem is an
 * error; in development the ones that only matter once the app is published are warnings.
 */
export function checkEnvironment(env: EnvVars, isProduction: boolean): EnvironmentReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const productionOnly = isProduction ? errors : warnings;

  const providerValue = env[LLM_PROVIDER_ENV_VAR]?.trim().toLowerCase() || "openrouter";
  if (!(LLM_PROVIDERS as readonly string[]).includes(providerValue)) {
    errors.push(`${LLM_PROVIDER_ENV_VAR}="${providerValue}" não é um de: ${LLM_PROVIDERS.join(", ")}.`);
  } else {
    const keyName = PROVIDER_KEYS[providerValue as LlmProvider];
    if (!isSet(env, keyName)) errors.push(`${keyName} é obrigatória com ${LLM_PROVIDER_ENV_VAR}=${providerValue}.`);
  }
  if (resolveEmbeddingProvider(env[EMBEDDING_PROVIDER_ENV_VAR]) === "gemini" && !isSet(env, GEMINI_API_KEY_ENV_VAR)) {
    errors.push(`${GEMINI_API_KEY_ENV_VAR} é obrigatória com ${EMBEDDING_PROVIDER_ENV_VAR}=gemini.`);
  }

  if (isSet(env, PUBLIC_URL_ENV_VAR) && !resolvePublicUrl(env[PUBLIC_URL_ENV_VAR])) {
    errors.push(`${PUBLIC_URL_ENV_VAR} precisa ser um endereço completo, ex.: https://magistral.duckdns.org.`);
  } else if (!isSet(env, PUBLIC_URL_ENV_VAR)) {
    productionOnly.push(`${PUBLIC_URL_ENV_VAR} não definida: informe o endereço público (ex.: https://magistral.duckdns.org).`);
  }
  if ((env[SECRET_KEY_ENV_VAR]?.trim().length ?? 0) < MIN_SECRET_KEY_CHARS) {
    productionOnly.push(
      `${SECRET_KEY_ENV_VAR} precisa de ao menos ${MIN_SECRET_KEY_CHARS} caracteres (gere com: openssl rand -base64 48).`,
    );
  }
  return { errors, warnings };
}
