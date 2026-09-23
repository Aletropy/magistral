import { HTTP_ACCEPTED, type TaskCreatedResponseBody } from "@/lib/http/api";
import { libraryReindexTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a rebuild of the vector index with the embedding model configured now. */
export async function POST(): Promise<Response> {
  const taskId = enqueueTask(libraryReindexTask, { title: "Reindexar a biblioteca", payload: {} });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
