import { HTTP_BAD_REQUEST, UPLOAD_FILE_FIELD } from "@/lib/http/api";
import { HttpError } from "@/lib/http/HttpError";
import { DocumentExtractionError } from "./errors";
import type { UploadedDocument } from "./extractText";
import { MAX_UPLOAD_BYTES } from "./formats";

export const MISSING_FILE_MESSAGE = "Selecione um arquivo PDF ou DOCX.";

/** The one document of an upload form, or a 400; an oversized file fails like extraction would. */
export async function readUploadedDocument(form: FormData): Promise<UploadedDocument> {
  const file = form.get(UPLOAD_FILE_FIELD);
  if (!(file instanceof File)) throw new HttpError(HTTP_BAD_REQUEST, MISSING_FILE_MESSAGE);
  if (file.size > MAX_UPLOAD_BYTES) throw new DocumentExtractionError("too_large");
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}
