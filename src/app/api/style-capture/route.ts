import { DocumentExtractionError } from "@/lib/documents/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import {
  HTTP_BAD_REQUEST,
  UPLOAD_FILE_FIELD,
  errorResponse,
  type StyleCaptureResponseBody,
} from "@/lib/http/api";
import { getStyleExtractor } from "@/lib/llm/getStyleExtractor";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { captureStyle } from "@/lib/style/captureStyle";

/** Gemini may think for a while over a long reference document. */
export const maxDuration = 300;

const MISSING_FILE_MESSAGE = "Selecione um arquivo PDF ou DOCX.";

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await captureStyle(getStyleExtractor(), { name: file.name, bytes });
    return Response.json({ result } satisfies StyleCaptureResponseBody);
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      const { status, message } = DOCUMENT_EXTRACTION_ERRORS[error.reason];
      return errorResponse(status, message);
    }
    console.error("[api/style-capture] capture failed", error);
    const { status, message } = toErrorResponseInfo(error);
    return errorResponse(status, message);
  }
}
