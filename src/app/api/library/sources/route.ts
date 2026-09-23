import { DocumentExtractionError } from "@/lib/documents/errors";
import { MAX_FILES_PER_UPLOAD, MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import {
  HTTP_BAD_REQUEST,
  UPLOAD_FILE_FIELD,
  UPLOAD_KIND_FIELD,
  errorResponse,
  type LibraryUploadOutcome,
  type LibraryUploadResponseBody,
} from "@/lib/http/api";
import { getEmbedder } from "@/lib/llm/getEmbedder";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { getLibraryRepository } from "@/lib/rag/getLibraryRepository";
import { ingestDocument } from "@/lib/rag/ingest";
import { LIBRARY_SOURCE_KINDS, type LibrarySourceKind } from "@/lib/rag/types";

/** Embedding a long code of laws takes several API round trips. */
export const maxDuration = 300;

function isKind(value: unknown): value is LibrarySourceKind {
  return typeof value === "string" && (LIBRARY_SOURCE_KINDS as readonly string[]).includes(value);
}

function failureMessage(error: unknown): string {
  if (error instanceof DocumentExtractionError) return DOCUMENT_EXTRACTION_ERRORS[error.reason].message;
  console.error("[api/library/sources] ingest failed", error);
  return toErrorResponseInfo(error).message;
}

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

  const library = getLibraryRepository();
  const embed = getEmbedder();
  const outcomes: LibraryUploadOutcome[] = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      outcomes.push({ fileName: file.name, status: "failed", message: DOCUMENT_EXTRACTION_ERRORS.too_large.message });
      continue;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const outcome = await ingestDocument(library, embed, { fileName: file.name, bytes, kind, folderPath: null });
      outcomes.push(
        outcome.status === "added"
          ? { fileName: file.name, status: "added" }
          : { fileName: file.name, status: "duplicate", message: `Já está na biblioteca como “${outcome.existing.title}”.` },
      );
    } catch (error) {
      outcomes.push({ fileName: file.name, status: "failed", message: failureMessage(error) });
    }
  }
  return Response.json({ outcomes } satisfies LibraryUploadResponseBody);
}
