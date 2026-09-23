import type { z } from "zod";
import type { BatchJobDetail } from "@/lib/batch/types";
import type { Clause } from "@/lib/clauses/types";
import type { ExportFormat } from "@/lib/export/formats";
import type { Persona } from "@/lib/personas/types";
import type { FolderSyncReport } from "@/lib/rag/syncFolder";
import type { StyleCaptureResult } from "@/lib/style/captureStyle";

export const MINUTA_ENDPOINT = "/api/minuta";
export const EXPORT_ENDPOINT = "/api/export";
export const PERSONAS_ENDPOINT = "/api/personas";
export const PLAYGROUND_ENDPOINT = "/api/playground";
export const STYLE_CAPTURE_ENDPOINT = "/api/style-capture";
export const CLAUSES_ENDPOINT = "/api/clauses";

export function clauseEndpoint(id: string): string {
  return `${CLAUSES_ENDPOINT}/${encodeURIComponent(id)}`;
}

export const BATCHES_ENDPOINT = "/api/batch";

export function batchEndpoint(id: string): string {
  return `${BATCHES_ENDPOINT}/${encodeURIComponent(id)}`;
}

export function batchRetryEndpoint(id: string): string {
  return `${batchEndpoint(id)}/retry`;
}

export function batchDownloadEndpoint(id: string, format: ExportFormat): string {
  return `${batchEndpoint(id)}/download?format=${format}`;
}

export const DEMO_CLAUSES_ENDPOINT = "/api/demo/clauses";
export const DEMO_LIBRARY_ENDPOINT = "/api/demo/library";

export interface DemoLoadedResponseBody {
  added: number;
}

export const EXTRACT_TEXT_ENDPOINT = "/api/documents/extract";
export const LIBRARY_SOURCES_ENDPOINT = "/api/library/sources";
export const LIBRARY_SYNC_ENDPOINT = "/api/library/sync";
export const LIBRARY_REINDEX_ENDPOINT = "/api/library/reindex";

export function librarySourceEndpoint(id: number): string {
  return `${LIBRARY_SOURCES_ENDPOINT}/${id}`;
}

/** The multipart field that carries uploaded documents (repeated for several files). */
export const UPLOAD_FILE_FIELD = "file";
/** The multipart field with the library kind of the uploaded documents. */
export const UPLOAD_KIND_FIELD = "kind";

export function personaEndpoint(id: string): string {
  return `${PERSONAS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export const HTTP_CREATED = 201;
export const HTTP_NO_CONTENT = 204;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_PAYLOAD_TOO_LARGE = 413;
export const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;
export const HTTP_UNPROCESSABLE_CONTENT = 422;

export const NETWORK_ERROR_MESSAGE =
  "Falha de conexão com o servidor. Verifique sua internet e tente novamente.";

export interface ApiErrorBody {
  error: string;
}

export interface RewriteResponseBody {
  markdown: string;
  /** Forbidden terms of the persona that still appear in the output. */
  forbiddenTermsFound: string[];
}

export interface ConsultedSource {
  ref: string;
  title: string;
  label: string;
}

/** Everything a generation produced; saved to the history as is. */
export interface DraftResult extends RewriteResponseBody {
  /** Library excerpts the minuta was grounded in; empty when the library was not used. */
  consultedSources: ConsultedSource[];
  /** "full" when the whole library fit in the prompt, "search" when hybrid search picked excerpts. */
  retrievalStrategy: "full" | "search" | null;
  /** False when the model moved the approved clauses out of the order the user chose. */
  approvedClauseOrderKept: boolean;
  /** The approved clauses as the user wrote them, in order, so the redline can show what the AI changed. */
  approvedClauses: ApprovedClauseText[];
}

export interface ApprovedClauseText {
  title: string;
  body: string;
}

export interface BatchCreatedResponseBody {
  id: string;
}

export interface BatchRetryResponseBody {
  requeued: number;
}

export interface BatchResponseBody {
  job: BatchJobDetail;
}

export interface ExtractTextResponseBody {
  text: string;
}

export type PlaygroundResponseBody = RewriteResponseBody;

export interface MinutaResponseBody extends DraftResult {
  /** The minuta's id in the history. */
  id: string;
}

export const MINUTAS_ENDPOINT = "/api/minutas";

export function minutaEndpoint(id: string): string {
  return `${MINUTAS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export interface StyleCaptureResponseBody {
  result: StyleCaptureResult;
}

export type LibraryUploadStatus = "added" | "duplicate" | "failed";

export interface LibraryUploadOutcome {
  fileName: string;
  status: LibraryUploadStatus;
  /** Why the file was skipped or failed, in pt-BR. */
  message?: string;
}

export interface LibraryUploadResponseBody {
  outcomes: LibraryUploadOutcome[];
}

export interface LibraryReindexResponseBody {
  chunks: number;
  model: string;
}

export interface LibrarySyncResponseBody {
  folder: string;
  report: FolderSyncReport;
}

export interface ClauseResponseBody {
  clause: Clause;
}

export interface PersonaResponseBody {
  persona: Persona;
}

export function sendJson(method: "POST" | "PUT", url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function postJson(url: string, body: unknown): Promise<Response> {
  return sendJson("POST", url, body);
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
