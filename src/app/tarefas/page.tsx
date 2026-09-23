import type { Metadata } from "next";
import { connection } from "next/server";
import { TaskList } from "@/components/tasks/TaskList";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { TASK_RETENTION_DAYS } from "@/lib/tasks/getTaskWorker";

export const metadata: Metadata = { title: "Tarefas" };

/** How many recent tasks the page lists. */
const TASK_PAGE_LIMIT = 100;

export default async function TasksPage() {
  await connection();
  const tasks = getTaskRepository().list({ limit: TASK_PAGE_LIMIT });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tudo o que demora roda em segundo plano: você pode continuar usando o Magistral e é avisado quando
          cada tarefa termina. Tarefas concluídas ficam aqui por {TASK_RETENTION_DAYS} dias.
        </p>
      </header>
      <TaskList initialTasks={tasks} />
    </main>
  );
}
