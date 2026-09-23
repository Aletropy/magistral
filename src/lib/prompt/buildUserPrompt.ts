import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
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

function attribute(value: string): string {
  return value.replace(/"/g, "'");
}

function formatSource(source: ContextSource): string {
  const context = source.context ? ` contexto="${attribute(source.context)}"` : "";
  return `<fonte id="${source.ref}" titulo="${attribute(source.title)}" trecho="${attribute(source.label)}"${context}>\n${source.text}\n</fonte>`;
}

/** The request as tagged sections, plus the library excerpts when the minuta is grounded in them. */
export function buildUserPrompt(request: MinutaRequest, sources: ContextSource[] = []): string {
  const parties = request.parties.map(formatParty).join("\n");
  const clauses = request.clauses || NO_SPECIFIC_CLAUSES;

  return [
    sources.length > 0 && `<fontes>\n${sources.map(formatSource).join("\n")}\n</fontes>`,
    "Redija a minuta descrita abaixo.",
    `<tipo_de_documento>\n${resolveDocumentTypeLabel(request)}\n</tipo_de_documento>`,
    `<partes>\n${parties}\n</partes>`,
    `<clausulas_especificas>\n${clauses}\n</clausulas_especificas>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** What the library is searched with: the document type and the requested clauses. */
export function buildRetrievalQuery(request: MinutaRequest): string {
  return [resolveDocumentTypeLabel(request), request.clauses].filter(Boolean).join("\n");
}
