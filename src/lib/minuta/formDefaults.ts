import { DEFAULT_PERSONA_ID } from "@/lib/personas/seeds";
import type { PersonaSummary } from "@/lib/personas/types";
import { DEFAULT_DOCUMENT_TYPE_ID } from "./documentTypes";
import type { MinutaFormValues } from "./schema";

/** A blank minuta form: two parties with the usual roles and the default persona. */
export function initialMinutaValues(personas: PersonaSummary[]): MinutaFormValues {
  const hasDefault = personas.some((persona) => persona.id === DEFAULT_PERSONA_ID);
  return {
    documentType: DEFAULT_DOCUMENT_TYPE_ID,
    customDocumentType: "",
    parties: [
      { name: "", role: "Contratante", qualification: "" },
      { name: "", role: "Contratada", qualification: "" },
    ],
    clauses: "",
    persona: hasDefault ? DEFAULT_PERSONA_ID : (personas[0]?.id ?? ""),
    useLibrary: false,
    approvedClauseIds: [],
    baseDocument: null,
  };
}
