import type { LlmCallStatus } from "./types";

const LOCALE = "pt-BR";
const MS_PER_SECOND = 1000;
/** Costs under one cent need more than two decimals to be meaningful. */
const COST_FRACTION_DIGITS = 4;
const LATENCY_FRACTION_DIGITS = 1;

const usdFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: COST_FRACTION_DIGITS,
  maximumFractionDigits: COST_FRACTION_DIGITS,
});
const integerFormatter = new Intl.NumberFormat(LOCALE);
const secondsFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: LATENCY_FRACTION_DIGITS,
  maximumFractionDigits: LATENCY_FRACTION_DIGITS,
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeStyle: "short" });
const dayFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeZone: "UTC" });

export const UNKNOWN_COST_LABEL = "—";

export const LLM_CALL_STATUS_LABELS: Record<LlmCallStatus, string> = {
  ok: "Sucesso",
  refusal: "Recusada",
  truncated: "Truncada",
  empty: "Vazia",
  invalid_output: "Resposta inválida",
  configuration: "Configuração",
  upstream: "Falha na API",
  canceled: "Cancelada",
};

export function formatUsd(value: number | null): string {
  return value === null ? UNKNOWN_COST_LABEL : usdFormatter.format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatLatency(milliseconds: number): string {
  return `${secondsFormatter.format(milliseconds / MS_PER_SECOND)} s`;
}

export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp));
}

/** Formats a YYYY-MM-DD day key without shifting it through the local time zone. */
export function formatDay(dayKey: string): string {
  return dayFormatter.format(new Date(`${dayKey}T00:00:00Z`));
}
