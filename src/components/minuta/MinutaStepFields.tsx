"use client";

import { ApprovedClausesField } from "@/components/ApprovedClausesField";
import { LibraryToggle } from "@/components/LibraryToggle";
import { PartiesField } from "@/components/PartiesField";
import { PersonaSelector } from "@/components/PersonaSelector";
import type { ClauseOption } from "@/lib/clauses/types";
import type { MinutaFormValues } from "@/lib/minuta/schema";
import type { WizardStepId } from "@/lib/minuta/wizardSteps";
import type { PersonaSummary } from "@/lib/personas/types";
import { ClausesTextField } from "./ClausesTextField";
import { DocumentTypeField } from "./DocumentTypeField";

/** The steps whose fields look the same in the step-by-step and the all-fields layouts. */
export type FieldStepId = Exclude<WizardStepId, "inicio" | "revisao">;

export interface MinutaStepFieldsProps {
  step: FieldStepId;
  values: MinutaFormValues;
  onChange: (changes: Partial<MinutaFormValues>) => void;
  errors: Record<string, string>;
  disabled: boolean;
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
}

/** The fields of one topic of the minuta request, shared by the wizard and the full form. */
export function MinutaStepFields({
  step,
  values,
  onChange,
  errors,
  disabled,
  personas,
  clauses,
  librarySourceCount,
}: MinutaStepFieldsProps) {
  switch (step) {
    case "tipo":
      return (
        <DocumentTypeField
          documentType={values.documentType}
          customDocumentType={values.customDocumentType}
          errors={errors}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "partes":
      return (
        <PartiesField parties={values.parties} errors={errors} disabled={disabled} onChange={(parties) => onChange({ parties })} />
      );
    case "condicoes":
      return (
        <ClausesTextField
          value={values.clauses}
          error={errors.clauses}
          disabled={disabled}
          onChange={(clauses) => onChange({ clauses })}
        />
      );
    case "clausulas":
      return (
        <ApprovedClausesField
          clauses={clauses}
          documentType={values.documentType}
          value={values.approvedClauseIds}
          error={errors.approvedClauseIds}
          disabled={disabled}
          onChange={(approvedClauseIds) => onChange({ approvedClauseIds })}
        />
      );
    case "persona":
      return (
        <PersonaSelector
          personas={personas}
          value={values.persona}
          error={errors.persona}
          disabled={disabled}
          onChange={(persona) => onChange({ persona })}
        />
      );
    case "fundamentacao":
      return (
        <LibraryToggle
          checked={values.useLibrary}
          sourceCount={librarySourceCount}
          disabled={disabled}
          onChange={(useLibrary) => onChange({ useLibrary })}
        />
      );
  }
}
