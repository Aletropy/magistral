import type { User } from "@/lib/auth/types";
import type { BatchJobDetail } from "@/lib/batch/types";
import type { ChatConversation, ChatConversationSummary } from "@/lib/chat/types";
import type { Clause } from "@/lib/clauses/types";
import type { AppNotification } from "@/lib/notifications/types";
import type { ExportFormat } from "@/lib/export/formats";
import type { Persona } from "@/lib/personas/types";
import type { StyleCaptureResult } from "@/lib/style/styleCaptureResult";
import type { TaskDetail, TaskSummary } from "@/lib/tasks/types";

export const MINUTA_ENDPOINT = "/api/minuta";
export const DRAFT_SUGGESTIONS_ENDPOINT = "/api/minuta/sugestoes";
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

export const CONVERSATIONS_ENDPOINT = "/api/chat/conversations";

export function conversationEndpoint(id: string): string {
  return `${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export function conversationMessagesEndpoint(id: string): string {
  return `${conversationEndpoint(id)}/messages`;
}

export function replyRetryEndpoint(conversationId: string, messageId: number): string {
  return `${conversationMessagesEndpoint(conversationId)}/${messageId}/retry`;
}

export interface ConversationsResponseBody {
  conversations: ChatConversationSummary[];
}

export interface ConversationResponseBody {
  conversation: ChatConversation;
}

export interface ConversationCreatedResponseBody {
  conversationId: string;
  taskId: string;
}

export const LOGIN_ENDPOINT = "/api/auth/login";
export const LOGOUT_ENDPOINT = "/api/auth/logout";
export const SETUP_ENDPOINT = "/api/auth/setup";
export const PASSWORD_ENDPOINT = "/api/auth/password";
export const USERS_ENDPOINT = "/api/users";

export function userEndpoint(id: string): string {
  return `${USERS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export interface UserResponseBody {
  user: User;
}

export const TASKS_ENDPOINT = "/api/tasks";

export function taskEndpoint(id: string): string {
  return `${TASKS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export function taskCancelEndpoint(id: string): string {
  return `${taskEndpoint(id)}/cancel`;
}

export function taskRetryEndpoint(id: string): string {
  return `${taskEndpoint(id)}/retry`;
}

export const NOTIFICATIONS_ENDPOINT = "/api/notifications";
export const NOTIFICATIONS_READ_ENDPOINT = `${NOTIFICATIONS_ENDPOINT}/read`;
export const ACTIVITY_ENDPOINT = "/api/activity";
/** Query parameter of the activity endpoint: the last notification id the client has seen. */
export const ACTIVITY_SINCE_PARAM = "since";

export function activityEndpoint(since: number | null): string {
  return since === null ? ACTIVITY_ENDPOINT : `${ACTIVITY_ENDPOINT}?${ACTIVITY_SINCE_PARAM}=${since}`;
}

/** Every slow action answers 202 with the id of the background task doing the work. */
export interface TaskCreatedResponseBody {
  taskId: string;
}

export interface TaskResponseBody {
  task: TaskDetail;
}

export interface TasksResponseBody {
  tasks: TaskSummary[];
}

export interface NotificationsResponseBody {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface ActivityResponseBody {
  activeTasks: TaskSummary[];
  /** Batch jobs with items still pending or running. */
  activeBatches: number;
  unreadCount: number;
  /** Notifications after the `since` cursor, oldest first; empty on the first poll. */
  notifications: AppNotification[];
  /** The cursor for the next poll. */
  latestId: number;
}

export const HTTP_CREATED = 201;
export const HTTP_ACCEPTED = 202;
export const HTTP_NO_CONTENT = 204;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_PAYLOAD_TOO_LARGE = 413;
export const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;
export const HTTP_MISDIRECTED_REQUEST = 421;
export const HTTP_UNPROCESSABLE_CONTENT = 422;
export const HTTP_TOO_MANY_REQUESTS = 429;

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

export interface ClauseResponseBody {
  clause: Clause;
}

export interface PersonaResponseBody {
  persona: Persona;
}

export function sendJson(method: "POST" | "PUT" | "PATCH", url: string, body: unknown): Promise<Response> {
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

/** Reads the error message from a failed API response, falling back when the body isn't JSON. */
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
