import { MAX_FILES_PER_UPLOAD, MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import {
  HTTP_ACCEPTED,
  HTTP_BAD_REQUEST,
  UPLOAD_FILE_FIELD,
  UPLOAD_KIND_FIELD,
  errorResponse,
  type TaskCreatedResponseBody,
} from "@/lib/http/api";
import { libraryUploadTask } from "@/lib/rag/libraryTasks";
import { LIBRARY_SOURCE_KINDS, type LibrarySourceKind } from "@/lib/rag/types";
import { enqueueTask } from "@/lib/tasks/getTaskWorker";
import { plural } from "@/lib/text/plural";

function isKind(value: unknown): value is LibrarySourceKind {
  return typeof value === "string" && (LIBRARY_SOURCE_KINDS as readonly string[]).includes(value);
}

/** Queues the uploaded documents for indexing; the files are kept with the task until it finishes. */
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(HTTP_BAD_REQUEST, "Envie os arquivos como formulário.");
  }
  const files = form.getAll(UPLOAD_FILE_FIELD).filter((entry): entry is File => entry instanceof File);
  const kind = form.get(UPLOAD_KIND_FIELD);
  if (files.length === 0) return errorResponse(HTTP_BAD_REQUEST, "Selecione ao menos um arquivo PDF ou DOCX.");
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return errorResponse(HTTP_BAD_REQUEST, `Envie no máximo ${MAX_FILES_PER_UPLOAD} arquivos por vez.`);
  }
  if (!isKind(kind)) return errorResponse(HTTP_BAD_REQUEST, "Selecione o tipo dos documentos.");
  const oversized = files.find((file) => file.size > MAX_UPLOAD_BYTES);
  if (oversized) {
    const { status, message } = DOCUMENT_EXTRACTION_ERRORS.too_large;
    return errorResponse(status, `${oversized.name}: ${message}`);
  }

  const taskFiles = await Promise.all(
    files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })),
  );
  const title = files.length === 1 ? files[0].name : plural(files.length, "documento", "documentos");
  const taskId = enqueueTask(libraryUploadTask, { title: `Biblioteca: ${title}`, payload: { kind }, files: taskFiles });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
}
