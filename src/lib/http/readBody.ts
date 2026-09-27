import { AppError } from "@/lib/errors/AppError";
import { HTTP_BAD_REQUEST, HTTP_PAYLOAD_TOO_LARGE, HTTP_UNSUPPORTED_MEDIA_TYPE } from "@/lib/http/status";

export const BODY_TOO_LARGE_MESSAGE = "A requisição é grande demais.";
export const INVALID_BODY_MESSAGE = "Corpo da requisição inválido.";
export const JSON_REQUIRED_MESSAGE = "Envie os dados como JSON.";
export const FORM_REQUIRED_MESSAGE = "Envie os arquivos como formulário.";
const JSON_CONTENT_TYPE = "application/json";
const MULTIPART_CONTENT_TYPE = "multipart/form-data";

function contentType(request: Request): string {
  return request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
}

/** The request body, refusing to buffer more than `maxBytes` whatever Content-Length claims. */
export async function readBodyBytes(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new AppError(HTTP_PAYLOAD_TOO_LARGE, BODY_TOO_LARGE_MESSAGE);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError(HTTP_PAYLOAD_TOO_LARGE, BODY_TOO_LARGE_MESSAGE);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * The parsed JSON body. The JSON content type is required: a cross-site form can only send text/plain,
 * so this also keeps other sites from posting data with the user's cookie.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (contentType(request) !== JSON_CONTENT_TYPE) throw new AppError(HTTP_UNSUPPORTED_MEDIA_TYPE, JSON_REQUIRED_MESSAGE);
  const bytes = await readBodyBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new AppError(HTTP_BAD_REQUEST, INVALID_BODY_MESSAGE);
  }
}

export async function readFormBody(request: Request, maxBytes: number): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (contentType(request) !== MULTIPART_CONTENT_TYPE) throw new AppError(HTTP_UNSUPPORTED_MEDIA_TYPE, FORM_REQUIRED_MESSAGE);
  const bytes = await readBodyBytes(request, maxBytes);
  try {
    return await new Response(bytes, { headers: { "content-type": type } }).formData();
  } catch {
    throw new AppError(HTTP_BAD_REQUEST, FORM_REQUIRED_MESSAGE);
  }
}
