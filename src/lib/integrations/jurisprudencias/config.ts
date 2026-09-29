/** The office's Jurisprudências.ai account, reached through its MCP server (docs: jurisprudencias.ai/docs/mcp). */
export const JURISPRUDENCIAS_PROVIDER = "jurisprudencias";
export const JURISPRUDENCIAS_NAME = "Jurisprudências.ai";
export const JURISPRUDENCIAS_MCP_URL = "https://jurisprudencias.ai/mcp";
export const JURISPRUDENCIAS_SITE_URL = "https://jurisprudencias.ai";
export const JURISPRUDENCIAS_OAUTH_SCOPE = "mcp";
/** Results must credit the source (the service's terms). */
export const JURISPRUDENCIAS_CREDIT = "Fonte: Jurisprudências.ai";

/** Where Jurisprudências.ai sends the admin back after they authorize the office's account. */
export const JURISPRUDENCIAS_CALLBACK_PATH = "/api/integrations/jurisprudencias/callback";

/** The MCP server's tool names. */
export const JURISPRUDENCIAS_TOOLS = {
  listCourts: "list_courts",
  search: "search_decisions",
  lookup: "lookup_decision",
} as const;

/** Court ids `search_decisions` and `lookup_decision` accept, as documented. */
export const COURT_IDS = [
  "stf", "stj", "tst",
  "trt1", "trt2", "trt3", "trt4", "trt5", "trt6", "trt7", "trt8", "trt9", "trt10", "trt13", "trt14",
  "trt16", "trt17", "trt18", "trt19", "trt20", "trt22", "trt23", "trt24",
  "trf1", "trf2", "trf3", "trf4", "trf5", "trf6",
  "tjac", "tjap", "tjba", "tjce", "tjdft", "tjes", "tjgo", "tjma", "tjmg", "tjms", "tjmt", "tjpa", "tjpb",
  "tjpe", "tjpr", "tjrj", "tjrn", "tjro", "tjrr", "tjrs", "tjsc", "tjse", "tjsp", "tjto",
  "carf",
] as const;
export type CourtId = (typeof COURT_IDS)[number];

/** Daily allowances per plan, reset at midnight in Brasília; shared with the service's own site and API. */
export const JURISPRUDENCIAS_DAILY_LIMITS = {
  free: { searches: 5, lookups: 10 },
  subscriber: { searches: 500, lookups: 10_000 },
} as const;
export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

/** How usage rows name a call, e.g. "jurisprudencias/search_decisions". */
export function usageModelOf(tool: string): string {
  return `${JURISPRUDENCIAS_PROVIDER}/${tool}`;
}
