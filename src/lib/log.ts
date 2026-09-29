/**
 * One JSON line per event on stderr, so a container's logs can be searched and parsed. Error details stay
 * in the log; users only ever see the pt-BR messages from toPublicError.
 */
export type LogLevel = "info" | "warn" | "error";

function describeError(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined) return undefined;
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { message: String(error) };
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}, error?: unknown): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields, error: describeError(error) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
