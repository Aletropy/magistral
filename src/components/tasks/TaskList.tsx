"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useActivity } from "@/components/activity/ActivityProvider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { TASK_POLL_INTERVAL_MS } from "@/hooks/useTask";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/http/client";
import type { TasksResponseBody } from "@/lib/http/contracts";
import { TASKS_ENDPOINT, taskCancelEndpoint, taskRetryEndpoint } from "@/lib/http/endpoints";
import { TASK_KIND_LABELS, isTaskActive, type TaskSummary } from "@/lib/tasks/types";
import { formatDateTime } from "@/lib/usage/format";
import { TaskProgressBar } from "./TaskProgressBar";
import { TaskStatusBadge } from "./TaskStatusBadge";

const ACTION_FAILED = "Não foi possível atualizar a tarefa. Tente novamente.";

/** Every recent task, refreshed while any of them is still running. */
export function TaskList({ initialTasks }: { initialTasks: TaskSummary[] }) {
  const { refresh: refreshActivity } = useActivity();
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const active = tasks.some((task) => isTaskActive(task.status));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(TASKS_ENDPOINT, { cache: "no-store" });
      if (response.ok) setTasks(((await response.json()) as TasksResponseBody).tasks);
    } catch {
      // The next poll tries again.
    }
  }, []);

  useLiveRefresh(refresh, active, TASK_POLL_INTERVAL_MS);

  async function act(url: string) {
    setError(null);
    try {
      const response = await fetch(url, { method: "POST" });
      if (!response.ok) setError(await readErrorMessage(response, ACTION_FAILED));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    }
    await refresh();
    refreshActivity();
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        Nenhuma tarefa ainda. Gerações de minuta, envios para a biblioteca e capturas de estilo aparecem aqui.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead className="hidden md:table-cell">Situação</TableHead>
              <TableHead className="hidden md:table-cell">Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{task.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {TASK_KIND_LABELS[task.kind]}
                    <span className="md:hidden"> · {formatDateTime(task.createdAt)}</span>
                  </span>
                  <div className="mt-2 flex flex-col gap-2 md:hidden">
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {task.status === "running" && (
                    <div className="mt-2 max-w-sm">
                      <TaskProgressBar progress={task.progress} />
                    </div>
                  )}
                  {task.error && <p className="mt-1 text-xs text-destructive">{task.error}</p>}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(task.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {task.href && task.status !== "canceled" && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={task.href}>Ver resultado</Link>
                      </Button>
                    )}
                    {isTaskActive(task.status) && (
                      <Button type="button" variant="outline" size="sm" onClick={() => void act(taskCancelEndpoint(task.id))}>
                        Cancelar
                      </Button>
                    )}
                    {(task.status === "failed" || task.status === "canceled") && (
                      <Button type="button" variant="outline" size="sm" onClick={() => void act(taskRetryEndpoint(task.id))}>
                        Tentar novamente
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
