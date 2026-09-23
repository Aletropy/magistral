import { z } from "zod";
import { MAX_APPROVED_CLAUSES } from "@/lib/clauses/schema";
import { DOCUMENT_TYPE_IDS } from "./documentTypes";
import {
  MAX_CLAUSES_CHARS,
  MAX_CUSTOM_DOCUMENT_TYPE_CHARS,
  MAX_PARTIES,
  MAX_PARTY_NAME_CHARS,
  MAX_PARTY_QUALIFICATION_CHARS,
  MAX_PARTY_ROLE_CHARS,
  MIN_PARTIES,
  baseDocumentSchema,
  type MinutaFormValues,
} from "./schema";

/** How many review notes are kept, and how long each may be. */
export const MAX_REVIEW_NOTES = 8;
export const MAX_REVIEW_NOTE_CHARS = 300;

const partyExtractionSchema = z.object({ name: z.string(), role: z.string(), qualification: z.string() });

/**
 * What the model returns when it reads a base document or a conversation. Strict structured outputs need
 * every field required and no length limits; "nothing found" is an empty string or list.
 */
export const draftExtractionSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_IDS),
  customDocumentType: z.string(),
  parties: z.array(partyExtractionSchema),
  /** One condition per item; joined into the form's bullet list (models often drop line breaks in a string). */
  clauses: z.array(z.string()),
  approvedClauseIds: z.array(z.string()),
  /** A persona id from the catalog, or empty when the source doesn't point to a tone. */
  personaId: z.string(),
  reviewNotes: z.array(z.string()),
});
export type DraftExtraction = z.infer<typeof draftExtractionSchema>;

export const DRAFT_EXTRACTION_JSON_SCHEMA = z.toJSONSchema(draftExtractionSchema);

/** The form fields a suggestion fills; persona and library choices stay the user's. */
export const suggestedDraftSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_IDS),
  customDocumentType: z.string(),
  parties: z.array(partyExtractionSchema),
  clauses: z.string(),
  approvedClauseIds: z.array(z.string()),
  /** Null keeps the persona already chosen in the form. */
  persona: z.string().nullable().default(null),
});
export type SuggestedDraft = z.infer<typeof suggestedDraftSchema>;

export const DRAFT_SUGGESTION_SOURCES = ["document", "conversation"] as const;

/** A finished suggestion task: the fields to apply, what to double-check, and the base document it read. */
export const draftSuggestionResultSchema = z.object({
  source: z.enum(DRAFT_SUGGESTION_SOURCES),
  /** The document's file name, or the conversation's title. */
  sourceName: z.string(),
  draft: suggestedDraftSchema,
  reviewNotes: z.array(z.string()),
  /** Kept so a suggestion reopened from its notification still carries the model document. */
  baseDocument: baseDocumentSchema.nullable(),
});
export type DraftSuggestionResult = z.infer<typeof draftSuggestionResultSchema>;

const EMPTY_PARTY = { name: "", role: "", qualification: "" };
const BULLET = "- ";
const LEADING_BULLET = /^[-•*]\s*/;

/** The conditions as the form's bullet list, one per line. */
function toClauseList(items: string[]): string {
  return items
    .map((item) => item.trim().replace(LEADING_BULLET, ""))
    .filter(Boolean)
    .map((item) => `${BULLET}${item}`)
    .join("\n");
}

function clip(text: string, maxChars: number): string {
  return text.trim().slice(0, maxChars);
}

/** The clauses and personas that exist, which suggestions may point to. */
export interface SuggestionCatalog {
  clauseIds: ReadonlySet<string>;
  personaIds: ReadonlySet<string>;
}

/**
 * Brings the model's reading within the form's limits: unknown clause and persona ids are dropped,
 * parties are capped and padded to the minimum, and every text is clipped.
 */
export function toSuggestedDraft(extraction: DraftExtraction, catalog: SuggestionCatalog): SuggestedDraft {
  const parties = extraction.parties
    .map((party) => ({
      name: clip(party.name, MAX_PARTY_NAME_CHARS),
      role: clip(party.role, MAX_PARTY_ROLE_CHARS),
      qualification: clip(party.qualification, MAX_PARTY_QUALIFICATION_CHARS),
    }))
    .filter((party) => party.name || party.role)
    .slice(0, MAX_PARTIES);
  while (parties.length < MIN_PARTIES) parties.push({ ...EMPTY_PARTY });

  return {
    documentType: extraction.documentType,
    customDocumentType: clip(extraction.customDocumentType, MAX_CUSTOM_DOCUMENT_TYPE_CHARS),
    parties,
    clauses: clip(toClauseList(extraction.clauses), MAX_CLAUSES_CHARS),
    approvedClauseIds: [...new Set(extraction.approvedClauseIds)]
      .filter((id) => catalog.clauseIds.has(id))
      .slice(0, MAX_APPROVED_CLAUSES),
    persona: catalog.personaIds.has(extraction.personaId) ? extraction.personaId : null,
  };
}

export function toReviewNotes(notes: string[]): string[] {
  return notes
    .map((note) => clip(note, MAX_REVIEW_NOTE_CHARS))
    .filter(Boolean)
    .slice(0, MAX_REVIEW_NOTES);
}

/** The form with a suggestion applied; clauses and personas deleted since the suggestion was made are left out. */
export function applySuggestion(
  values: MinutaFormValues,
  suggestion: DraftSuggestionResult,
  available: SuggestionCatalog,
): MinutaFormValues {
  const { draft } = suggestion;
  return {
    ...values,
    persona: draft.persona && available.personaIds.has(draft.persona) ? draft.persona : values.persona,
    documentType: draft.documentType,
    customDocumentType: draft.customDocumentType,
    parties: draft.parties,
    clauses: draft.clauses,
    approvedClauseIds: draft.approvedClauseIds.filter((id) => available.clauseIds.has(id)),
    baseDocument: suggestion.baseDocument ?? values.baseDocument ?? null,
  };
}
