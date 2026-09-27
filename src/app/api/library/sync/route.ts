import type { TaskCreatedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_ACCEPTED } from "@/lib/http/status";
import { librarySyncTask } from "@/lib/rag/libraryTasks";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/** Queues a sync of the library folder (admins only: it can remove documents). */
export const POST = defineRoute({ access: "admin" }, ({ user }) => {
  const taskId = enqueueTask(librarySyncTask, {
    ownerId: user.id,
    title: "Sincronizar pasta da biblioteca",
    payload: {},
  });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
