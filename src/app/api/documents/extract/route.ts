import { DocumentExtractionError } from "@/lib/documents/errors";
import { extractText } from "@/lib/documents/extractText";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import {
  HTTP_BAD_REQUEST,
  UPLOAD_FILE_FIELD,
  errorResponse,
  type ExtractTextResponseBody,
} from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

const MISSING_FILE_MESSAGE = "Selecione um arquivo PDF ou DOCX.";

/** Returns the plain text of an uploaded PDF or DOCX, e.g. the original a minuta is compared against. */
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

  try {
    const text = await extractText({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return Response.json({ text } satisfies ExtractTextResponseBody);
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      const { status, message } = DOCUMENT_EXTRACTION_ERRORS[error.reason];
      return errorResponse(status, message);
    }
    console.error("[api/documents/extract] extraction failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
