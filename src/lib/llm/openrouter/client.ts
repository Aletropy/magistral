import "server-only";
import { LlmConfigurationError } from "../errors";
import type { OpenRouterClient } from "./api";
import { OPENROUTER_API_KEY_ENV_VAR, OPENROUTER_MODELS_ENV_VAR, resolveOpenRouterModels } from "./config";
import { createOpenRouterClient } from "./httpClient";

let client: OpenRouterClient | undefined;

export function getOpenRouterClient(): OpenRouterClient {
  const apiKey = process.env[OPENROUTER_API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new LlmConfigurationError(`Environment variable ${OPENROUTER_API_KEY_ENV_VAR} is not set.`);
  }
  client ??= createOpenRouterClient(apiKey);
  return client;
}

/** The fallback model list from OPENROUTER_MODELS, or the defaults. */
export function getOpenRouterModels(): string[] {
  return resolveOpenRouterModels(process.env[OPENROUTER_MODELS_ENV_VAR]);
}
