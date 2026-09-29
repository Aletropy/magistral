import { z } from "zod";
import type { TaskRepository } from "@/lib/tasks/repository";
import { TASK_KIND_LABELS, TASK_STATUS_LABELS } from "@/lib/tasks/types";
import { plural } from "@/lib/text/plural";
import { defineReadTool } from "../tool";

export const RECENT_TASKS = 10;

export function createListTasksTool({ tasks }: { tasks: TaskRepository }) {
  return defineReadTool({
    name: "ver_tarefas",
    description:
      "Mostra as tarefas em segundo plano do usuário (gerações de minuta, envios para a biblioteca…): as em andamento e as últimas terminadas, com o erro de cada falha.",
    input: z.object({}),
    progressLabel: "Consultando as tarefas",
    async run(_input, { ownerId }) {
      const recent = tasks.list({ ownerId, limit: RECENT_TASKS });
      const lines = recent.map((task) => {
        const progress = task.progress?.label ? `, ${task.progress.label}` : "";
        const error = task.error ? `; erro: ${task.error}` : "";
        return `- ${TASK_KIND_LABELS[task.kind]}: ${task.title} (${TASK_STATUS_LABELS[task.status]}${progress}, criada em ${task.createdAt})${error}`;
      });
      return {
        output: lines.length > 0 ? lines.join("\n") : "Nenhuma tarefa recente.",
        summary: `Consultei as tarefas (${plural(recent.length, "recente", "recentes")})`,
      };
    },
  });
}
