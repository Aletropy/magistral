import { DEFAULT_PERSONA_ID } from "@/lib/personas/seeds";
import type { PersonaSummary } from "@/lib/personas/types";
import { DEFAULT_DOCUMENT_TYPE_ID } from "./documentTypes";
import { DOCUMENT_TYPE_PRESETS } from "./documentTypePresets";
import type { MinutaFormValues } from "./schema";

/** A blank minuta form: two parties with the default type's usual roles and the default persona. */
export function initialMinutaValues(personas: PersonaSummary[]): MinutaFormValues {
  const hasDefault = personas.some((persona) => persona.id === DEFAULT_PERSONA_ID);
  return {
    documentType: DEFAULT_DOCUMENT_TYPE_ID,
    customDocumentType: "",
    parties: DOCUMENT_TYPE_PRESETS[DEFAULT_DOCUMENT_TYPE_ID].roles.map((role) => ({ name: "", role, qualification: "" })),
    clauses: "",
    persona: hasDefault ? DEFAULT_PERSONA_ID : (personas[0]?.id ?? ""),
    useLibrary: false,
    approvedClauseIds: [],
    baseDocument: null,
  };
}
