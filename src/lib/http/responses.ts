import type { ApiErrorBody } from "@/lib/http/contracts";

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message } satisfies ApiErrorBody, { status });
}
