"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActivity } from "@/components/activity/ActivityProvider";
import { TaskProgressBar } from "@/components/tasks/TaskProgressBar";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { TASK_STATUS_LABELS } from "@/lib/tasks/types";
import { plural } from "@/lib/text/plural";
import { DashboardCard } from "./DashboardCard";

/** What is running for the user right now, live from the activity stream. */
export function ActiveWorkCard() {
  const { activeTasks, activeBatches } = useActivity();
  const idle = activeTasks.length === 0 && activeBatches === 0;

  return (
    <DashboardCard title="Em andamento" href={TASKS_PATH} linkLabel="Ver tarefas">
      {idle ? (
        <p className="text-sm text-muted-foreground">Nada rodando agora. Gerações e leituras aparecem aqui enquanto acontecem.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-live="polite">
          {activeTasks.map((task) => (
            <li key={task.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                <span className="min-w-0 truncate font-medium">{task.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{TASK_STATUS_LABELS[task.status]}</span>
              </div>
              <TaskProgressBar progress={task.progress} />
            </li>
          ))}
          {activeBatches > 0 && (
            <li className="text-sm">
              <Link href={BATCHES_PATH} className="text-primary hover:underline">
                {plural(activeBatches, "lote gerando", "lotes gerando")}
              </Link>
            </li>
          )}
        </ul>
      )}
    </DashboardCard>
  );
}
