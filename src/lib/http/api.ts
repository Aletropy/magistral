import type { z } from "zod";

export const MINUTA_ENDPOINT = "/api/minuta";
export const EXPORT_ENDPOINT = "/api/export";

export const HTTP_BAD_REQUEST = 400;

export const NETWORK_ERROR_MESSAGE =
  "Falha de conexão com o servidor. Verifique sua internet e tente novamente.";

export interface ApiErrorBody {
  error: string;
}

export interface MinutaResponseBody {
  markdown: string;
}

export function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message } satisfies ApiErrorBody, { status });
}

/** Parses a JSON request body against a schema; returns either the data or a ready 400 response. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: errorResponse(HTTP_BAD_REQUEST, "Corpo da requisição inválido.") };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { response: errorResponse(HTTP_BAD_REQUEST, result.error.issues[0].message) };
  }
  return { data: result.data };
}

/** Reads the error message from a failed API response, falling back when the body isn't JSON. */
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
