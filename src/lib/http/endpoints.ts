import type { ExportFormat } from "@/lib/export/formats";

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

export const LOGIN_ENDPOINT = "/api/auth/login";
export const LOGOUT_ENDPOINT = "/api/auth/logout";
export const SETUP_ENDPOINT = "/api/auth/setup";
export const PASSWORD_ENDPOINT = "/api/auth/password";
export const USERS_ENDPOINT = "/api/users";

export function userEndpoint(id: string): string {
  return `${USERS_ENDPOINT}/${encodeURIComponent(id)}`;
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

export const MINUTAS_ENDPOINT = "/api/minutas";

export function minutaEndpoint(id: string): string {
  return `${MINUTAS_ENDPOINT}/${encodeURIComponent(id)}`;
}

/** The server-sent event stream that tells the user's pages their background work changed. */
export const EVENTS_ENDPOINT = "/api/events";
/** The event name the stream sends. */
export const ACTIVITY_EVENT_NAME = "activity";

export const FEEDBACK_ENDPOINT = "/api/feedback";

export function feedbackEndpoint(id: number): string {
  return `${FEEDBACK_ENDPOINT}/${id}`;
}
