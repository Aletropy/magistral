export const TASK_STATUSES = ["pending", "running", "succeeded", "failed", "canceled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Na fila",
  running: "Em andamento",
  succeeded: "Concluída",
  failed: "Falhou",
  canceled: "Cancelada",
};

/**
 * Tasks run in lanes with their own concurrency, so a long library reindex never delays a chat reply,
 * and library writes (which reshape the vector index) never overlap.
 */
export const TASK_LANES = ["llm", "library"] as const;
export type TaskLane = (typeof TASK_LANES)[number];

export const TASK_KINDS = [
  "minuta.draft",
  "library.upload",
  "library.sync",
  "library.reindex",
  "library.demo",
  "style.capture",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  "minuta.draft": "Geração de minuta",
  "library.upload": "Envio para a biblioteca",
  "library.sync": "Sincronização da biblioteca",
  "library.reindex": "Reindexação da biblioteca",
  "library.demo": "Exemplos da biblioteca",
  "style.capture": "Captura de estilo",
};

export interface TaskProgress {
  current: number;
  /** Null when the amount of work isn't known up front. */
  total: number | null;
  label: string | null;
}

export interface TaskSummary {
  id: string;
  kind: TaskKind;
  title: string;
  status: TaskStatus;
  /** Last error; kept on a pending task that is waiting to be retried. */
  error: string | null;
  attempts: number;
  progress: TaskProgress | null;
  /** Where the result can be seen, taken from the task's notification once it finished. */
  href: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TaskDetail extends TaskSummary {
  /** The handler's result, as JSON; validate it with the handler's schema before use. */
  result: unknown;
}

/** A task the worker has claimed, with everything its handler needs. */
export interface ClaimedTask {
  id: string;
  kind: TaskKind;
  lane: TaskLane;
  title: string;
  payload: unknown;
  /** Including the current attempt. */
  attempts: number;
}

export interface TaskFile {
  position: number;
  name: string;
  bytes: Uint8Array;
  /** What happened to the file on an earlier attempt; set files are skipped when a task resumes. */
  outcome: string | null;
}

export interface NewTaskFile {
  name: string;
  bytes: Uint8Array;
}

export interface NewTask {
  kind: TaskKind;
  lane: TaskLane;
  title: string;
  payload: unknown;
  files?: NewTaskFile[];
}

const ACTIVE_STATUSES: ReadonlySet<TaskStatus> = new Set(["pending", "running"]);

/** Whether a task can still change: queued, waiting for a retry, or running. */
export function isTaskActive(status: TaskStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}
