/** Error names the fetch API, @google/genai and @anthropic-ai/sdk use when a call is aborted through a signal. */
const ABORT_ERROR_NAMES = new Set(["AbortError", "APIUserAbortError"]);

/** Whether a failure is the caller cancelling the call (e.g. the user cancelled the background task). */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && ABORT_ERROR_NAMES.has(error.name);
}

/** The error a call rejects with when its signal fires, whatever reason the signal carries. */
export function abortErrorOf(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  if (isAbortError(reason)) return reason as Error;
  return new DOMException("The operation was aborted.", "AbortError");
}
