import { z } from "zod";
import { DOCUMENT_TYPE_IDS } from "./documentTypes";
import type { MinutaFormValues } from "./schema";

/** Where an unsent minuta form is kept in this browser, so leaving the page never loses what was typed. */
export const MINUTA_DRAFT_STORAGE_KEY = "magistral-minuta-rascunho";

/** The form's shape without its rules: a half-filled draft must still load. */
const storedValuesSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_IDS),
  customDocumentType: z.string(),
  parties: z.array(z.object({ name: z.string(), role: z.string(), qualification: z.string() })),
  clauses: z.string(),
  persona: z.string(),
  useLibrary: z.boolean(),
  approvedClauseIds: z.array(z.string()),
  baseDocument: z.object({ name: z.string(), text: z.string() }).nullable(),
});

const storedDraftSchema = z.object({ savedAt: z.string(), values: storedValuesSchema });
export type StoredDraft = z.infer<typeof storedDraftSchema>;

export function serializeDraft(values: MinutaFormValues, savedAt: Date): string {
  return JSON.stringify({ savedAt: savedAt.toISOString(), values: { ...values, baseDocument: values.baseDocument ?? null } });
}

/** The saved draft, or null when there is none or it no longer fits the form (e.g. after an update). */
export function parseStoredDraft(json: string | null): StoredDraft | null {
  if (!json) return null;
  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
