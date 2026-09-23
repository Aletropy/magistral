import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { Clause } from "@/lib/clauses/types";
import type { MinutaRequest, Party } from "@/lib/minuta/schema";
import type { ContextSource } from "@/lib/rag/selectContext";

const NO_QUALIFICATION = "não informada";
const NO_SPECIFIC_CLAUSES =
  "Nenhuma cláusula específica foi solicitada; use as cláusulas usuais para este tipo de documento.";

export function resolveDocumentTypeLabel(request: MinutaRequest): string {
  return request.documentType === OTHER_DOCUMENT_TYPE_ID
    ? request.customDocumentType
    : DOCUMENT_TYPE_LABELS[request.documentType];
}

function formatParty(party: Party, index: number): string {
  const qualification = party.qualification || NO_QUALIFICATION;
  return `${index + 1}. ${party.name}, na qualidade de ${party.role}. Qualificação: ${qualification}`;
}

/** How much of a base document joins the library search query: its opening names the subject. */
const BASE_DOCUMENT_QUERY_CHARS = 1500;
/** Anything shaped like a closing tag, which could end a block early. */
const CLOSING_TAG = /<\/\s*[\w-]+\s*>/g;

export function attribute(value: string): string {
  return value.replace(/"/g, "'");
}

/**
 * Makes user or document text safe to wrap in a tagged block: closing tags inside it are removed, so the
 * text can't end the block and pose as instructions.
 */
export function sanitizeTagContent(text: string): string {
  return text.replace(CLOSING_TAG, "");
}

export function formatSource(source: ContextSource): string {
  const context = source.context ? ` contexto="${attribute(source.context)}"` : "";
  return `<fonte id="${source.ref}" titulo="${attribute(source.title)}" trecho="${attribute(source.label)}"${context}>\n${sanitizeTagContent(source.text)}\n</fonte>`;
}

function formatApprovedClause(clause: Clause, index: number): string {
  return `<clausula ordem="${index + 1}" titulo="${attribute(clause.title)}">\n${clause.body}\n</clausula>`;
}

export interface UserPromptContext {
  /** Library excerpts the minuta is grounded in. */
  sources: ContextSource[];
  /** Pre-approved clauses to include, in order. */
  approvedClauses: Clause[];
}

export const EMPTY_PROMPT_CONTEXT: UserPromptContext = { sources: [], approvedClauses: [] };

/** The request as tagged sections, plus library excerpts and approved clauses when there are any. */
export function buildUserPrompt(request: MinutaRequest, context: UserPromptContext = EMPTY_PROMPT_CONTEXT): string {
  const parties = request.parties.map(formatParty).join("\n");
  const clauses = request.clauses || NO_SPECIFIC_CLAUSES;
  const { sources, approvedClauses } = context;
  const base = request.baseDocument;

  return [
    sources.length > 0 && `<fontes>\n${sources.map(formatSource).join("\n")}\n</fontes>`,
    base && `<documento_base nome="${attribute(base.name)}">\n${sanitizeTagContent(base.text)}\n</documento_base>`,
    base ? "Redija a minuta descrita abaixo, usando o documento base como modelo." : "Redija a minuta descrita abaixo.",
    `<tipo_de_documento>\n${resolveDocumentTypeLabel(request)}\n</tipo_de_documento>`,
    `<partes>\n${parties}\n</partes>`,
    approvedClauses.length > 0 &&
      `<clausulas_aprovadas>\n${approvedClauses.map(formatApprovedClause).join("\n")}\n</clausulas_aprovadas>`,
    `<clausulas_especificas>\n${clauses}\n</clausulas_especificas>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** What the library is searched with: the document type, the requested clauses and the base document's opening. */
export function buildRetrievalQuery(request: MinutaRequest): string {
  const base = request.baseDocument?.text.slice(0, BASE_DOCUMENT_QUERY_CHARS);
  return [resolveDocumentTypeLabel(request), request.clauses, base].filter(Boolean).join("\n");
}
