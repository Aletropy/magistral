import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { Clause } from "@/lib/clauses/types";
import type { MinutaRequest, Party } from "@/lib/minuta/schema";
import type { ContextSource } from "@/lib/rag/selectContext";
import { blockGroup, taggedBlock } from "./taggedBlock";

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
export function formatSource(source: ContextSource): string {
  const attributes: Record<string, string> = { id: source.ref, titulo: source.title, trecho: source.label };
  if (source.context) attributes.contexto = source.context;
  return taggedBlock("fonte", source.text, attributes);
}

function formatApprovedClause(clause: Clause, index: number): string {
  return taggedBlock("clausula", clause.body, { ordem: String(index + 1), titulo: clause.title });
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
    sources.length > 0 && blockGroup("fontes", sources.map(formatSource)),
    base && taggedBlock("documento_base", base.text, { nome: base.name }),
    base ? "Redija a minuta descrita abaixo, usando o documento base como modelo." : "Redija a minuta descrita abaixo.",
    taggedBlock("tipo_de_documento", resolveDocumentTypeLabel(request)),
    taggedBlock("partes", parties),
    approvedClauses.length > 0 && blockGroup("clausulas_aprovadas", approvedClauses.map(formatApprovedClause)),
    taggedBlock("clausulas_especificas", clauses),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** What the library is searched with: the document type, the requested clauses and the base document's opening. */
export function buildRetrievalQuery(request: MinutaRequest): string {
  const base = request.baseDocument?.text.slice(0, BASE_DOCUMENT_QUERY_CHARS);
  return [resolveDocumentTypeLabel(request), request.clauses, base].filter(Boolean).join("\n");
}
