import { HTTP_ACCEPTED, type TaskCreatedResponseBody } from "@/lib/http/api";
import { libraryDemoTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues indexing of the example norms (idempotent); the first run also downloads the local model. */
export async function POST(): Promise<Response> {
  const taskId = enqueueTask(libraryDemoTask, { title: "Carregar normas de exemplo", payload: {} });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
