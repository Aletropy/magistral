import { AppError } from "@/lib/errors/AppError";
import {
  HTTP_BAD_GATEWAY,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
} from "@/lib/http/status";
import { JURISPRUDENCIAS_DAILY_LIMITS, JURISPRUDENCIAS_NAME } from "./config";

const { free, subscriber } = JURISPRUDENCIAS_DAILY_LIMITS;

export const NOT_CONNECTED_MESSAGE = `A ${JURISPRUDENCIAS_NAME} não está conectada. Um administrador conecta a conta do escritório em Integrações.`;
export const RECONNECT_MESSAGE = `A conexão com a ${JURISPRUDENCIAS_NAME} expirou ou foi revogada. Um administrador precisa conectar de novo em Integrações.`;
export const DAILY_LIMIT_MESSAGE = `O limite diário da ${JURISPRUDENCIAS_NAME} acabou (plano gratuito: ${free.searches} buscas e ${free.lookups} consultas por dia; assinatura: ${subscriber.searches} buscas). Ele renova à meia-noite de Brasília.`;
export const AUTHORIZATION_FAILED_MESSAGE = `Não foi possível concluir a conexão com a ${JURISPRUDENCIAS_NAME}. Tente conectar de novo.`;
export const AUTHORIZATION_DENIED_MESSAGE = `A autorização na ${JURISPRUDENCIAS_NAME} foi recusada ou cancelada.`;
export const INVALID_STATE_MESSAGE = "Este retorno de autorização não corresponde à conexão iniciada. Comece de novo em Integrações.";
export const UNREADABLE_MESSAGE = "A chave de segurança do servidor mudou e a conexão salva não pode ser lida. Conecte de novo.";
const CALL_FAILED_PREFIX = `A ${JURISPRUDENCIAS_NAME} não atendeu a consulta`;
const MAX_UPSTREAM_DETAIL_CHARS = 300;

export class JurisprudenciasNotConnectedError extends AppError {
  constructor(message: string = NOT_CONNECTED_MESSAGE) {
    super(HTTP_CONFLICT, message);
  }
}

export class JurisprudenciasLimitError extends AppError {
  constructor() {
    super(HTTP_TOO_MANY_REQUESTS, DAILY_LIMIT_MESSAGE);
  }
}

export class JurisprudenciasAuthorizationError extends AppError {
  constructor(message: string) {
    super(HTTP_BAD_REQUEST, message);
  }
}

/** The service answered with an error; its own words (short) help the assistant adjust the query. */
export class JurisprudenciasCallError extends AppError {
  constructor(detail: string) {
    const trimmed = detail.trim().slice(0, MAX_UPSTREAM_DETAIL_CHARS);
    super(HTTP_BAD_GATEWAY, trimmed ? `${CALL_FAILED_PREFIX}: ${trimmed}` : `${CALL_FAILED_PREFIX}.`);
  }
}

/** Words the service uses when a daily allowance is used up. */
const LIMIT_WORDS = /limite|limit|quota|cota|excedid|exceeded/i;

export function isLimitMessage(text: string): boolean {
  return LIMIT_WORDS.test(text);
}
