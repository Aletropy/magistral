"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ApprovedClausesField } from "@/components/ApprovedClausesField";
import { LibraryToggle } from "@/components/LibraryToggle";
import { BaseDocumentField } from "@/components/minuta/BaseDocumentField";
import { ClausesTextField } from "@/components/minuta/ClausesTextField";
import { DocumentTypeField } from "@/components/minuta/DocumentTypeField";
import { PartiesField } from "@/components/PartiesField";
import { PersonaSelector } from "@/components/PersonaSelector";
import { Button } from "@/components/ui/button";
import type { ClauseOption } from "@/lib/clauses/types";
import { minutaRequestSchema, type MinutaFormValues, type MinutaRequest } from "@/lib/minuta/schema";
import type { PersonaSummary } from "@/lib/personas/types";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

interface MinutaFormProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  values: MinutaFormValues;
  onValuesChange: (values: MinutaFormValues) => void;
  /** Button text; the batch creator reuses the form to build its template. */
  submitLabel?: string;
  busyLabel?: string;
  /** The request is being sent: fields and button wait. */
  isSubmitting: boolean;
  /** Work started by the form is still running: only the button waits, the fields stay editable. */
  isBusy?: boolean;
  /** Shown under a loaded base document, e.g. the AI fill-in offer. */
  baseDocumentExtras?: ReactNode;
  onSubmit: (request: MinutaRequest) => void;
}

/** Every minuta field on one page; the wizard is the guided alternative over the same values. */
export function MinutaForm({
  personas,
  clauses,
  librarySourceCount,
  values,
  onValuesChange,
  submitLabel = "Gerar minuta",
  busyLabel = "Gerando minuta…",
  isSubmitting,
  isBusy = false,
  baseDocumentExtras,
  onSubmit,
}: MinutaFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(changes: Partial<MinutaFormValues>) {
    onValuesChange({ ...values, ...changes });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The toggle can't be on for an empty library (e.g. emptied in another tab after it was checked).
    const result = minutaRequestSchema.safeParse({ ...values, useLibrary: values.useLibrary && librarySourceCount > 0 });
    if (!result.success) {
      setErrors(collectFieldErrors(result.error));
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <details className="group rounded-lg border bg-card p-3" open={Boolean(values.baseDocument)}>
        <summary className="cursor-pointer text-sm font-medium">Documento base (opcional)</summary>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Envie um contrato ou modelo que a nova minuta deve seguir.
        </p>
        <BaseDocumentField
          value={values.baseDocument}
          error={errors["baseDocument.text"]}
          disabled={isSubmitting}
          onChange={(baseDocument) => update({ baseDocument })}
        >
          {baseDocumentExtras}
        </BaseDocumentField>
      </details>

      <DocumentTypeField
        documentType={values.documentType}
        customDocumentType={values.customDocumentType}
        errors={errors}
        disabled={isSubmitting}
        onChange={update}
      />

      <PartiesField
        parties={values.parties}
        errors={errors}
        disabled={isSubmitting}
        onChange={(parties) => update({ parties })}
      />

      <ApprovedClausesField
        clauses={clauses}
        documentType={values.documentType}
        value={values.approvedClauseIds}
        error={errors.approvedClauseIds}
        disabled={isSubmitting}
        onChange={(approvedClauseIds) => update({ approvedClauseIds })}
      />

      <ClausesTextField
        value={values.clauses}
        error={errors.clauses}
        disabled={isSubmitting}
        onChange={(clauses) => update({ clauses })}
      />

      <PersonaSelector
        personas={personas}
        value={values.persona}
        error={errors.persona}
        disabled={isSubmitting}
        onChange={(persona) => update({ persona })}
      />

      <LibraryToggle
        checked={values.useLibrary}
        sourceCount={librarySourceCount}
        disabled={isSubmitting}
        onChange={(useLibrary) => update({ useLibrary })}
      />

      <Button type="submit" size="lg" disabled={isSubmitting || isBusy}>
        {isSubmitting || isBusy ? busyLabel : submitLabel}
      </Button>
    </form>
  );
}
