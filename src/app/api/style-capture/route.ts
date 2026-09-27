import { MAX_SINGLE_UPLOAD_REQUEST_BYTES } from "@/lib/documents/formats";
import { readUploadedDocument } from "@/lib/documents/readUpload";
import type { TaskCreatedResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";
import { HTTP_ACCEPTED } from "@/lib/http/status";
import { readStyleDocument } from "@/lib/style/captureStyle";
import { captureStyleTask } from "@/lib/style/captureStyleTask";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

/**
 * Reads the document's text now, so unreadable files fail at once, and queues the style analysis.
 * Only the text is kept, and it is erased from the task once the analysis succeeds.
 */
export const POST = defineRoute({ maxBodyBytes: MAX_SINGLE_UPLOAD_REQUEST_BYTES }, async ({ user, readForm }) => {
  const document = await readUploadedDocument(await readForm());
  const text = await readStyleDocument(document);
  const taskId = enqueueTask(captureStyleTask, {
    ownerId: user.id,
    title: `Estilo de ${document.name}`,
    payload: { fileName: document.name, text },
  });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
