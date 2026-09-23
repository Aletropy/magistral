import { HTTP_ACCEPTED, type TaskCreatedResponseBody } from "@/lib/http/api";
import { librarySyncTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a sync of the library folder. */
export async function POST(): Promise<Response> {
  const taskId = enqueueTask(librarySyncTask, { title: "Sincronizar pasta da biblioteca", payload: {} });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
