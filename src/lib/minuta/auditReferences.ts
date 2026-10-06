import "server-only";
import { z } from "zod";
import { parseStructured } from "@/lib/llm/parseStructured";
import type { StructuredGenerator } from "@/lib/llm/types";
import type { ContextSource } from "@/lib/rag/selectContext";

export interface ExtractedReference {
  /** The citation as written, e.g. "art. 5º da Lei Complementar nº 7/1973". */
  reference: string;
  /** The sentence around it, so the check reads the claim in context. */
  sentence: string;
}

const MAX_REFERENCES = 20;
const MAX_EXCERPT_CHARS = 3000;

const ARTICLE = /\b(art(?:igo)?\.?)\s*(\d+)\s*[ºoª°]?/gi;
const NORM = /\b(lei|decreto|parecer|portaria|resolução|resolucao|súmula|sumula)\s+(complementar\s+|ordinária\s+|ordinaria\s+)?n?\s*[ºo.]?\s*([\d][\d./-]*\d|\d+)/gi;

/** Exported for tests: group 2 holds the article number, groups 1 and 3 the norm kind and number. */
export const REFERENCE_PATTERNS = { ARTICLE, NORM };

function sentencesOf(markdown: string): string[] {
  return markdown
    .split(/(?<=[.!?\n])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * Norm and article mentions a minuta uses as grounds ("art. 5º", "Lei Complementar nº 7/1973").
 * Deduplicated, in order of appearance.
 */
export function extractNormReferences(markdown: string): ExtractedReference[] {
  const found: ExtractedReference[] = [];
  const seen = new Set<string>();
  for (const sentence of sentencesOf(markdown)) {
    for (const pattern of [ARTICLE, NORM]) {
      pattern.lastIndex = 0;
      for (const match of sentence.matchAll(pattern)) {
        const reference = match[0].trim();
        const key = reference.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          found.push({ reference, sentence });
        }
        if (found.length >= MAX_REFERENCES) return found;
      }
    }
  }
  return found;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ºª°]/g, "")
    .replace(/\s+/g, " ");
}

/** Whether the cited number and kind of norm show up in a consulted source. */
export function matchReferenceInSources(
  match: RegExpMatchArray,
  isArticle: boolean,
  sources: ContextSource[],
): ContextSource | null {
  const haystacks = sources.map((source) => ({ source, text: normalize(`${source.title}\n${source.label}\n${source.text}`) }));
  if (isArticle) {
    const number = match[2];
    const pattern = new RegExp(`\\bart(?:igo)?\\.?\\s*${number}\\b`);
    return haystacks.find(({ text }) => pattern.test(text))?.source ?? null;
  }
  const kind = normalize(match[1]);
  const number = normalize(match[3]);
  return (
    haystacks.find(({ text }) => text.includes(kind) && text.includes(number))?.source ?? null
  );
}

const verdictSchema = z.object({
  verdicts: z.array(
    z.object({
      reference: z.string(),
      status: z.enum(["confirmada", "nao_confirmada"]),
      motivo: z.string(),
    }),
  ),
});

const VERDICT_SCHEMA_NAME = "verificacao_referencias";
const VERDICT_JSON_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reference: { type: "string" },
          status: { type: "string", enum: ["confirmada", "nao_confirmada"] },
          motivo: { type: "string" },
        },
        required: ["reference", "status", "motivo"],
      },
    },
  },
  required: ["verdicts"],
};

function excerptOf(source: ContextSource): string {
  const text = source.text.length > MAX_EXCERPT_CHARS ? `${source.text.slice(0, MAX_EXCERPT_CHARS)} […]` : source.text;
  return `[${source.ref}] ${source.title} — ${source.label}\n${text}`;
}

export interface ReferenceAudit {
  checked: number;
  unconfirmed: { reference: string; reason: string }[];
}

/**
 * Checks every norm reference of a draft against the consulted sources: a deterministic
 * number-and-kind match first, then one judge call weighing each claim against its excerpt.
 * References the judge leaves out count as unconfirmed. Throws when the judge call fails.
 */
export async function auditMinutaReferences(
  markdown: string,
  sources: ContextSource[],
  generate: StructuredGenerator,
  options: { signal?: AbortSignal } = {},
): Promise<ReferenceAudit> {
  const references = extractNormReferences(markdown);
  const matches = new Map<string, ContextSource | null>();
  {
    const article = new RegExp(ARTICLE.source, "gi");
    const norm = new RegExp(NORM.source, "gi");
    for (const { reference } of references) {
      article.lastIndex = 0;
      const articleMatch = article.exec(reference);
      if (articleMatch) {
        matches.set(reference, matchReferenceInSources(articleMatch, true, sources));
        continue;
      }
      norm.lastIndex = 0;
      const normMatch = norm.exec(reference);
      matches.set(reference, normMatch ? matchReferenceInSources(normMatch, false, sources) : null);
    }
  }

  const prompt = {
    system: [
      "Você confere citações jurídicas de uma minuta contra as fontes consultadas.",
      "Para cada referência, responda confirmada quando a fonte trouxer a norma ou artigo citado dando suporte ao trecho, e nao_confirmada quando o número não existir na fonte, o trecho disser outra coisa ou nada nas fontes sustentar a citação.",
      "A pré-checagem é só um indício mecânico (número e tipo localizados ou não); o seu julgamento sobre o conteúdo prevalece.",
      "Responda só com o JSON pedido, sem explicações fora dele.",
    ].join(" "),
    user: [
      "Referências e trechos onde aparecem:",
      ...references.map(({ reference, sentence }) => {
        const matched = matches.get(reference);
        const hint = matched ? `localizada em [${matched.ref}]` : "não localizada nas fontes";
        return `- ${reference} | Trecho: ${sentence} | Pré-checagem: ${hint}`;
      }),
      "",
      "Fontes consultadas:",
      ...sources.map(excerptOf),
    ].join("\n"),
    temperature: 0,
  };
  const { text, usage } = await generate(prompt, { name: VERDICT_SCHEMA_NAME, schema: VERDICT_JSON_SCHEMA }, options);
  const { verdicts } = parseStructured(verdictSchema, text, usage);
  const byReference = new Map(verdicts.map((verdict) => [verdict.reference, verdict]));
  return {
    checked: references.length,
    unconfirmed: references
      .map(({ reference }) => {
        const verdict = byReference.get(reference);
        if (!verdict) return { reference, reason: "Verificação inconclusiva." };
        if (verdict.status === "confirmada") return null;
        return { reference, reason: verdict.motivo || "Não confirmada na fonte." };
      })
      .filter((item) => item !== null),
  };
}
