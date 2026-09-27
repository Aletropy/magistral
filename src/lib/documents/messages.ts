import { HTTP_BAD_REQUEST, HTTP_PAYLOAD_TOO_LARGE, HTTP_UNPROCESSABLE_CONTENT, HTTP_UNSUPPORTED_MEDIA_TYPE } from "@/lib/http/status";
import type { ErrorResponseInfo } from "@/lib/llm/errors";
import type { DocumentExtractionFailure } from "./errors";
import { MAX_UPLOAD_MEBIBYTES } from "./formats";

export const DOCUMENT_EXTRACTION_ERRORS: Record<DocumentExtractionFailure, ErrorResponseInfo> = {
  unsupported_type: {
    status: HTTP_UNSUPPORTED_MEDIA_TYPE,
    message: "Envie um arquivo PDF ou DOCX.",
  },
  too_large: {
    status: HTTP_PAYLOAD_TOO_LARGE,
    message: `O arquivo passa do limite de ${MAX_UPLOAD_MEBIBYTES} MB.`,
  },
  too_long: {
    status: HTTP_PAYLOAD_TOO_LARGE,
    message: "O texto do documento é longo demais para ser processado. Envie um trecho menor.",
  },
  no_text: {
    status: HTTP_UNPROCESSABLE_CONTENT,
    message: "Não encontramos texto no arquivo. PDFs digitalizados (imagem) não são suportados.",
  },
  unreadable: {
    status: HTTP_BAD_REQUEST,
    message: "Não foi possível ler o arquivo. Verifique se ele não está corrompido ou protegido por senha.",
  },
};
