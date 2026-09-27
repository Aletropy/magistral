import { isAbortError } from "./abort";
import { anthropicErrorInfo } from "./anthropic/errors";
import {
  CONFIGURATION_ERROR,
  GENERATION_FAILURES,
  LlmConfigurationError,
  LlmOutputError,
  OPERATION_CANCELED,
  UNEXPECTED_ERROR,
  type ErrorResponseInfo,
} from "./errors";
import { geminiErrorInfo } from "./gemini/errors";
import { openRouterErrorInfo } from "./openrouter/errors";

/** Maps any failure from the generation path to a safe HTTP status and pt-BR message. */
export function toErrorResponseInfo(error: unknown): ErrorResponseInfo {
  if (error instanceof LlmConfigurationError) return CONFIGURATION_ERROR;
  if (error instanceof LlmOutputError) return GENERATION_FAILURES[error.reason];
  if (isAbortError(error)) return OPERATION_CANCELED;
  return openRouterErrorInfo(error) ?? anthropicErrorInfo(error) ?? geminiErrorInfo(error) ?? UNEXPECTED_ERROR;
}
