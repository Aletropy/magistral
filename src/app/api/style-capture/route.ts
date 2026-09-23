import { DocumentExtractionError } from "@/lib/documents/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import {
  HTTP_ACCEPTED,
  HTTP_BAD_REQUEST,
  UPLOAD_FILE_FIELD,
  errorResponse,
  type TaskCreatedResponseBody,
} from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { readStyleDocument } from "@/lib/style/captureStyle";
import { captureStyleTask } from "@/lib/style/captureStyleTask";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";

const MISSING_FILE_MESSAGE = "Selecione um arquivo PDF ou DOCX.";

/**
 * Reads the document's text now, so unreadable files fail at once, and queues the style analysis.
 * Only the text is kept, and only until the task finishes.
 */
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(HTTP_BAD_REQUEST, MISSING_FILE_MESSAGE);
  }
  const file = form.get(UPLOAD_FILE_FIELD);
  if (!(file instanceof File)) return errorResponse(HTTP_BAD_REQUEST, MISSING_FILE_MESSAGE);
  if (file.size > MAX_UPLOAD_BYTES) {
    const { status, message } = DOCUMENT_EXTRACTION_ERRORS.too_large;
    return errorResponse(status, message);
  }

  let text: string;
  try {
    text = await readStyleDocument({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      const { status, message } = DOCUMENT_EXTRACTION_ERRORS[error.reason];
      return errorResponse(status, message);
    }
    console.error("[api/style-capture] text extraction failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }

  const taskId = enqueueTask(captureStyleTask, {
    title: `Estilo de ${file.name}`,
    payload: { fileName: file.name, text },
  });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
