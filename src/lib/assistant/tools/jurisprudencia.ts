import { z } from "zod";
import type { JurisprudenciasCaller } from "@/lib/integrations/jurisprudencias/caller";
import {
  COURT_IDS,
  JURISPRUDENCIAS_CREDIT,
  JURISPRUDENCIAS_NAME,
  JURISPRUDENCIAS_TOOLS,
} from "@/lib/integrations/jurisprudencias/config";
import { defineReadTool, type ToolContext, type ToolOutcome } from "../tool";
import type { CitationRegistry } from "../citations";

/** Decisions carry full ementas; a page of them may take more room than other results. */
const DECISIONS_RESULT_MAX_CHARS = 30_000;
const MAX_QUERY_CHARS = 500;
const MAX_TERMS = 10;
const MAX_TERM_CHARS = 100;
const MAX_PAGE = 50;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_HINT = "Formato AAAA-MM-DD.";
/** Field names the service may use for a decision's number, court and date; the first present is shown. */
const NUMBER_FIELDS = ["process_number", "numero_processo", "case_number", "number", "numero"];
const COURT_FIELDS = ["court", "tribunal", "court_abbreviation"];
const DATE_FIELDS = ["publication_date", "trial_date", "data_publicacao", "date"];
const LIST_FIELDS = ["decisions", "results", "items", "data"];

/**
 * How the model should use the numbered decisions: each one gets a [Jn] that lands in the reply's
 * "Fontes consultadas" list with the provider's credit, and the prose prefers natural references to
 * scattered mid-sentence markers — without ever hiding where the decision came from.
 */
const CITATION_NOTE = `Cada decisão usada recebe um identificador ([J1], [J2]…) e entra na lista “Fontes consultadas” da resposta. Ao apresentar uma decisão, indique a fonte: ${JURISPRUDENCIAS_CREDIT}. Na prosa, prefira referir-se a elas de forma natural (“as decisões consultadas”, “a jurisprudência do STJ”) a espalhar marcadores no meio do texto. Não cite decisões fora desta lista e não invente ementas.`;

const terms = z.array(z.string().trim().min(1).max(MAX_TERM_CHARS)).max(MAX_TERMS);
const date = z.string().regex(DATE, DATE_HINT);
const court = z.enum(COURT_IDS).describe("Sigla do tribunal em minúsculas (ex.: stj, tjsp, trf4).");

const searchInputSchema = z
  .object({
    tribunal: court,
    consulta: z
      .string()
      .trim()
      .max(MAX_QUERY_CHARS)
      .optional()
      .describe("Termos separados por espaço (todos devem aparecer), “frases entre aspas”, OR entre alternativas, -termo para excluir."),
    intencao: z
      .object({
        obrigatorios: terms.default([]),
        qualquerUm: terms.default([]),
        frases: terms.default([]),
        excluir: terms.default([]),
      })
      .optional()
      .describe("Alternativa estruturada à consulta; tem precedência quando as duas vêm."),
    pagina: z.number().int().min(0).max(MAX_PAGE).default(0).describe("Começa em 0."),
    ordenarPor: z.enum(["publicacao", "julgamento"]).default("publicacao"),
    publicadoDe: date.optional(),
    publicadoAte: date.optional(),
    julgadoDe: date.optional(),
    julgadoAte: date.optional(),
  })
  .refine((input) => Boolean(input.consulta) || input.intencao !== undefined, {
    error: "Informe a consulta ou a intenção da pesquisa.",
  });
type SearchInput = z.infer<typeof searchInputSchema>;

const lookupInputSchema = z.object({
  tribunal: court,
  processo: z.string().trim().min(1).max(MAX_TERM_CHARS).describe("Número do processo, como aparece na decisão."),
});

function toSearchArguments(input: SearchInput): Record<string, unknown> {
  const { tribunal, consulta, intencao } = input;
  return {
    court: tribunal,
    ...(intencao
      ? {
          query_intent: {
            required: intencao.obrigatorios,
            any_of: intencao.qualquerUm,
            phrases: intencao.frases,
            exclude: intencao.excluir,
          },
        }
      : { query: consulta }),
    page: input.pagina,
    sort_by: input.ordenarPor === "julgamento" ? "trial_date" : "publication_date",
    ...(input.publicadoDe && { pub_from: input.publicadoDe }),
    ...(input.publicadoAte && { pub_to: input.publicadoAte }),
    ...(input.julgadoDe && { trial_from: input.julgadoDe }),
    ...(input.julgadoAte && { trial_to: input.julgadoAte }),
  };
}

type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const firstText = (item: Json, fields: string[]): string | null => {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

/** The list of decisions in a JSON answer: the answer itself, or the first list-like field of it. */
function decisionList(data: unknown): Json[] | null {
  const list = Array.isArray(data)
    ? data
    : isRecord(data)
      ? LIST_FIELDS.map((field) => data[field]).find((value) => Array.isArray(value))
      : null;
  return Array.isArray(list) && list.length > 0 && list.every(isRecord) ? (list as Json[]) : null;
}

/**
 * Numbers what the service answered so the model can cite it: each decision gets a [Jn] when the answer
 * is a JSON list; otherwise the whole answer is one reference described by `fallback`.
 */
export function numberDecisions(text: string, citations: CitationRegistry, fallback: { title: string; label: string }): string {
  let data: unknown = null;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    // Plain text answer: handled below.
  }
  const list = decisionList(data);
  if (list && Array.isArray(data)) return JSON.stringify(annotate(list, citations), null, 1);
  if (list && isRecord(data)) {
    const field = LIST_FIELDS.find((name) => Array.isArray(data[name]))!;
    return JSON.stringify({ ...data, [field]: annotate(list, citations) }, null, 1);
  }
  const [ref] = citations.addDecisions([fallback]);
  return `[${ref}] ${text}`;
}

function annotate(list: Json[], citations: CitationRegistry): Json[] {
  const refs = citations.addDecisions(
    list.map((item, index) => {
      const number = firstText(item, NUMBER_FIELDS);
      const courtName = firstText(item, COURT_FIELDS);
      return {
        title: [courtName, number].filter(Boolean).join(" ") || `Decisão ${index + 1}`,
        label: firstText(item, DATE_FIELDS) ?? "Ementa",
      };
    }),
  );
  return list.map((item, index) => ({ ref: refs[index], ...item }));
}

function outcome(text: string, summary: string, card?: ToolOutcome["card"]): ToolOutcome {
  return {
    output: `${CITATION_NOTE}\n\n${text}`,
    summary,
    card: card ?? null,
    maxOutputChars: DECISIONS_RESULT_MAX_CHARS,
  };
}

export interface JurisprudenciaDeps {
  call: JurisprudenciasCaller;
}

/** Tools over the office's Jurisprudências.ai account; offered only while it is connected. */
export function createJurisprudenciaTools({ call }: JurisprudenciaDeps) {
  const run = (tool: string, args: Record<string, unknown>, context: ToolContext) => call(tool, args, { signal: context.signal });

  return [
    defineReadTool({
      name: "pesquisar_jurisprudencia",
      description:
        "Pesquisa decisões de um tribunal brasileiro na Jurisprudências.ai. Cada busca conta no limite diário do escritório (plano gratuito: 5 por dia), então pesquise só quando o usuário pedir ou a resposta depender de jurisprudência, escolha o tribunal certo e capriche nos termos. Devolve decisões com ementa, numeradas [J1], [J2]….",
      input: searchInputSchema,
      progressLabel: `Pesquisando na ${JURISPRUDENCIAS_NAME}`,
      async run(input, context) {
        const text = await run(JURISPRUDENCIAS_TOOLS.search, toSearchArguments(input), context);
        const what = input.consulta ?? "a pesquisa estruturada";
        const numbered = numberDecisions(text, context.citations, {
          title: `${input.tribunal.toUpperCase()} — pesquisa`,
          label: `“${what}”, página ${input.pagina + 1}`,
        });
        return outcome(numbered, `Pesquisei jurisprudência no ${input.tribunal.toUpperCase()}: “${what}”`);
      },
    }),
    defineReadTool({
      name: "consultar_decisao",
      description:
        "Traz a decisão completa (ementa) de um processo pelo tribunal e número, na Jurisprudências.ai. Conta no limite diário de consultas. Use para conferir uma decisão que o usuário citou.",
      input: lookupInputSchema,
      progressLabel: `Consultando a decisão na ${JURISPRUDENCIAS_NAME}`,
      async run({ tribunal, processo }, context) {
        const text = await run(JURISPRUDENCIAS_TOOLS.lookup, { court: tribunal, process_number: processo }, context);
        const [ref] = context.citations.addDecisions([{ title: `${tribunal.toUpperCase()} ${processo}`, label: "Ementa" }]);
        return outcome(`[${ref}] ${text}`, `Consultei a decisão ${processo} do ${tribunal.toUpperCase()}`);
      },
    }),
    defineReadTool({
      name: "listar_tribunais",
      description:
        "Lista os tribunais disponíveis na Jurisprudências.ai, com a sigla e a quantidade de decisões de cada um. Use só se estiver em dúvida sobre a sigla de um tribunal.",
      input: z.object({}),
      progressLabel: "Consultando os tribunais",
      async run(_input, context) {
        const text = await run(JURISPRUDENCIAS_TOOLS.listCourts, {}, context);
        return { output: text, summary: "Consultei os tribunais disponíveis", maxOutputChars: DECISIONS_RESULT_MAX_CHARS };
      },
    }),
  ];
}
