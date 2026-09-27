import type { Metadata } from "next";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
import { TaskList } from "@/components/tasks/TaskList";
import { requireUser } from "@/lib/auth/dal";
import { getTaskRepository } from "@/lib/tasks/getTaskRepository";
import { TASK_RETENTION_DAYS } from "@/lib/tasks/getTaskWorker";

export const metadata: Metadata = { title: "Tarefas" };

/** How many recent tasks the page lists. */
const TASK_PAGE_LIMIT = 100;

export default async function TasksPage() {
  await connection();
  const user = await requireUser();
  const tasks = getTaskRepository().list({ ownerId: user.id, limit: TASK_PAGE_LIMIT });

  return (
    <Page
      title="Tarefas"
      width="wide"
      description={
        <>
          Tudo o que demora roda em segundo plano: você pode continuar usando o Magistral e é avisado quando cada
          tarefa termina. Tarefas concluídas ficam aqui por {TASK_RETENTION_DAYS} dias.
        </>
      }
    >
      <TaskList initialTasks={tasks} />
    </Page>
  );
}
