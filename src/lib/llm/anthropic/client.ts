import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LlmConfigurationError } from "../errors";
import { ANTHROPIC_API_KEY_ENV_VAR } from "./config";

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env[ANTHROPIC_API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new LlmConfigurationError(`Environment variable ${ANTHROPIC_API_KEY_ENV_VAR} is not set.`);
  }

  client ??= new Anthropic({ apiKey });
  return client;
}
