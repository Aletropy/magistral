import type { DocumentTypeId } from "./documentTypes";
import { DOCUMENT_TYPE_PRESETS } from "./documentTypePresets";
import type { Party } from "./schema";

/** What the wizard's conditions step collected: the answers to the type's questions and anything else. */
export interface WizardConditions {
  answers: Record<string, string>;
  extra: string;
}

export const EMPTY_CONDITIONS: WizardConditions = { answers: {}, extra: "" };

/**
 * The request's `clauses` text from the wizard's answers: one "- Label: answer" line per answered question
 * of the type, then the free text. The request, the API and batch templates keep using plain text.
 */
export function buildClausesFromConditions(documentType: DocumentTypeId, { answers, extra }: WizardConditions): string {
  const lines = DOCUMENT_TYPE_PRESETS[documentType].questions.flatMap((question) => {
    const answer = answers[question.id]?.trim();
    return answer ? [`- ${question.label}: ${answer}`] : [];
  });
  return [...lines, extra.trim()].filter(Boolean).join("\n");
}

/** Conditions for a request that didn't come from the wizard (a resumed draft, an AI suggestion). */
export function conditionsFromClauses(clauses: string): WizardConditions {
  return { answers: {}, extra: clauses };
}

/**
 * Parties with the new type's usual roles, where the role still is the old type's default (or empty):
 * switching from Locação to Prestação de serviços turns "Locador" into "Contratante", but a role the user
 * typed stays.
 */
export function applyPresetRoles(parties: Party[], from: DocumentTypeId, to: DocumentTypeId): Party[] {
  const previous = DOCUMENT_TYPE_PRESETS[from].roles;
  const next = DOCUMENT_TYPE_PRESETS[to].roles;
  return parties.map((party, index) => {
    const isDefault = party.role.trim() === "" || party.role === previous[index];
    return isDefault && next[index] ? { ...party, role: next[index] } : party;
  });
}
