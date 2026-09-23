import type { TokenUsage } from "./types";

/** The server is missing or has invalid LLM settings (API key, provider name). */
export class LlmConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigurationError";
  }
}

export type GenerationFailureReason = "refusal" | "truncated" | "empty" | "invalid_output";

export class MinutaGenerationError extends Error {
  readonly reason: GenerationFailureReason;
  /** Tokens the provider billed before the failure, when it answered at all. */
  readonly usage?: TokenUsage;

  constructor(reason: GenerationFailureReason, usage?: TokenUsage) {
    super(`Minuta generation failed: ${reason}`);
    this.name = "MinutaGenerationError";
    this.reason = reason;
    this.usage = usage;
  }
}

export interface ErrorResponseInfo {
  status: number;
  message: string;
}

export const CONFIGURATION_ERROR: ErrorResponseInfo = {
  status: 500,
  message: "O serviço de IA não está configurado corretamente. Avise o administrador.",
};
export const RATE_LIMITED: ErrorResponseInfo = {
  status: 429,
  message: "Muitas solicitações no momento. Aguarde alguns instantes e tente novamente.",
};
/** The provider's free daily allowance is used up; retrying today won't help. */
export const DAILY_QUOTA_EXHAUSTED: ErrorResponseInfo = {
  status: 429,
  message:
    "A cota diária gratuita da IA acabou. Tente novamente amanhã ou configure uma chave com cobrança.",
};
export const UPSTREAM_TIMEOUT: ErrorResponseInfo = {
  status: 504,
  message: "A IA demorou demais para responder. Tente de novo; modelos gratuitos às vezes ficam lentos.",
};
export const SERVICE_UNAVAILABLE: ErrorResponseInfo = {
  status: 503,
  message: "O serviço de IA está indisponível agora. Tente novamente em alguns minutos.",
};
export const UPSTREAM_FAILURE: ErrorResponseInfo = {
  status: 502,
  message: "Não foi possível gerar a minuta. Tente novamente.",
};
/** nginx's "client closed request": the caller cancelled, so no one is waiting for this answer. */
const HTTP_CLIENT_CLOSED_REQUEST = 499;
export const OPERATION_CANCELED: ErrorResponseInfo = {
  status: HTTP_CLIENT_CLOSED_REQUEST,
  message: "A operação foi cancelada.",
};
export const UNEXPECTED_ERROR: ErrorResponseInfo = {
  status: 500,
  message: "Ocorreu um erro inesperado. Tente novamente.",
};

export const GENERATION_FAILURES: Record<GenerationFailureReason, ErrorResponseInfo> = {
  refusal: {
    status: 422,
    message: "A IA recusou esta solicitação. Revise as informações e cláusulas enviadas.",
  },
  truncated: {
    status: 502,
    message: "A minuta ficou longa demais e veio incompleta. Reduza o escopo e tente novamente.",
  },
  empty: UPSTREAM_FAILURE,
  invalid_output: {
    status: 502,
    message: "A IA devolveu uma resposta fora do formato esperado. Tente novamente.",
  },
};

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;

/** Maps an upstream LLM API HTTP status to the response we give the client. */
export function errorInfoForUpstreamStatus(status: number): ErrorResponseInfo {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) return CONFIGURATION_ERROR;
  if (status === HTTP_TOO_MANY_REQUESTS) return RATE_LIMITED;
  if (status >= HTTP_SERVER_ERROR_MIN) return SERVICE_UNAVAILABLE;
  return UPSTREAM_FAILURE;
}
