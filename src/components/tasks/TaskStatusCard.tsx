"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { TaskDetail } from "@/lib/tasks/types";
import { TaskProgressBar } from "./TaskProgressBar";

const BACKGROUND_HINT = "Pode continuar usando o Magistral: avisaremos quando terminar.";
const WAITING_RETRY_HINT = "Tentando de novo em instantes";

interface TaskStatusCardProps {
  task: TaskDetail | null;
  /** What is being done, e.g. "Redigindo a minuta"; shown while the task runs. */
  runningTitle: string;
  isStale?: boolean;
  actionError?: string | null;
  onCancel: () => void;
  onRetry: () => void;
  /** Extra content under the failure message, e.g. a way to start over. */
  children?: ReactNode;
}

/**
 * The state of a background task a page started: progress and a cancel button while it runs, the error
 * and a retry button when it failed. Renders nothing once it succeeded; the page shows the result.
 */
export function TaskStatusCard({
  task,
  runningTitle,
  isStale = false,
  actionError = null,
  onCancel,
  onRetry,
  children,
}: TaskStatusCardProps) {
  if (task?.status === "succeeded") return null;
  const active = !task || task.status === "pending" || task.status === "running";
  const waitingRetry = task?.status === "pending" && task.error !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4" role="status" aria-live="polite">
      {active ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium">{task?.status === "pending" ? "Na fila…" : `${runningTitle}…`}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={!task}>
              Cancelar
            </Button>
          </div>
          <TaskProgressBar progress={task?.progress ?? null} />
          <p className="text-xs text-muted-foreground">
            {waitingRetry ? `${WAITING_RETRY_HINT} (${task.error})` : BACKGROUND_HINT}
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className={task.status === "failed" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {task.status === "failed" ? (task.error ?? "A tarefa falhou.") : "Tarefa cancelada."}
          </p>
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={onRetry}>
            Tentar novamente
          </Button>
          {children}
        </div>
      )}
      {isStale && <p className="text-xs text-muted-foreground">Sem conexão com o servidor; tentando de novo…</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
    </div>
  );
}
