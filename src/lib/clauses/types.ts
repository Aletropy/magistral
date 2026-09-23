import type { DocumentTypeId } from "@/lib/minuta/documentTypes";

export interface Clause {
  id: string;
  title: string;
  category: string;
  documentTypes: DocumentTypeId[];
  /** Pre-approved wording, in Markdown. */
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Whether a clause is offered for a document type ("outro" sees every clause). */
export function clauseAppliesTo(clause: Pick<Clause, "documentTypes">, documentType: DocumentTypeId): boolean {
  return documentType === "outro" || clause.documentTypes.length === 0 || clause.documentTypes.includes(documentType);
}
