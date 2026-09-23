import "server-only";
import type { MinutaGenerationInitialState } from "@/hooks/useMinutaGeneration";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { draftTaskResultSchema } from "./draftTaskResult";

/** The draft task a page was opened with, plus the saved minuta when it already finished. */
export function loadGenerationState(taskId: string | null): MinutaGenerationInitialState {
  const task = taskId ? getTaskRepository().get(taskId) : null;
  if (!task || task.kind !== "minuta.draft") return { task: null, result: null };

  const finished = task.status === "succeeded" ? draftTaskResultSchema.safeParse(task.result) : null;
  const minuta = finished?.success ? getMinutaRepository().get(finished.data.minutaId) : null;
  return { task, result: minuta ? { ...minuta.result, id: minuta.id } : null };
}
