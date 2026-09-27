import { HTTP_ACCEPTED, type TaskCreatedResponseBody } from "@/lib/http/api";
import { defineRoute } from "@/lib/http/route";
import { libraryDemoTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues indexing of the example norms (idempotent); the first run also downloads the local model. */
export const POST = defineRoute({}, ({ user }) => {
  const taskId = enqueueTask(libraryDemoTask, { ownerId: user.id, title: "Carregar normas de exemplo", payload: {} });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
