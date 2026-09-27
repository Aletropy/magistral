import type { TaskCreatedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_ACCEPTED } from "@/lib/http/status";
import { libraryReindexTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a rebuild of the vector index with the embedding model configured now (admins only). */
export const POST = defineRoute({ access: "admin" }, ({ user }) => {
  const taskId = enqueueTask(libraryReindexTask, { ownerId: user.id, title: "Reindexar a biblioteca", payload: {} });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
