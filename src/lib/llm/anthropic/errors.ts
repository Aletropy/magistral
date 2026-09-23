import Anthropic from "@anthropic-ai/sdk";
import { SERVICE_UNAVAILABLE, errorInfoForUpstreamStatus, type ErrorResponseInfo } from "../errors";

/** Maps Anthropic SDK errors; returns null for anything the SDK didn't raise. */
export function anthropicErrorInfo(error: unknown): ErrorResponseInfo | null {
  if (error instanceof Anthropic.APIConnectionError) return SERVICE_UNAVAILABLE;
  if (error instanceof Anthropic.APIError && error.status !== undefined) {
    return errorInfoForUpstreamStatus(error.status);
  }
  return null;
}
