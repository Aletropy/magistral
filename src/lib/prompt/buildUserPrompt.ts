import { DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import type { MinutaRequest, Party } from "@/lib/minuta/schema";

const NO_QUALIFICATION = "não informada";
const NO_SPECIFIC_CLAUSES =
  "Nenhuma cláusula específica foi solicitada; use as cláusulas usuais para este tipo de documento.";

function resolveDocumentTypeLabel(request: MinutaRequest): string {
  return request.documentType === OTHER_DOCUMENT_TYPE_ID
    ? request.customDocumentType
    : DOCUMENT_TYPE_LABELS[request.documentType];
}

function formatParty(party: Party, index: number): string {
  const qualification = party.qualification || NO_QUALIFICATION;
  return `${index + 1}. ${party.name}, na qualidade de ${party.role}. Qualificação: ${qualification}`;
}

export function buildUserPrompt(request: MinutaRequest): string {
  const parties = request.parties.map(formatParty).join("\n");
  const clauses = request.clauses || NO_SPECIFIC_CLAUSES;

  return [
    "Redija a minuta descrita abaixo.",
    `<tipo_de_documento>\n${resolveDocumentTypeLabel(request)}\n</tipo_de_documento>`,
    `<partes>\n${parties}\n</partes>`,
    `<clausulas_especificas>\n${clauses}\n</clausulas_especificas>`,
  ].join("\n\n");
}
