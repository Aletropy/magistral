"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { BaseDocumentField } from "@/components/minuta/BaseDocumentField";
import { MinutaStepFields, type FieldStepId } from "@/components/minuta/MinutaStepFields";
import { Button } from "@/components/ui/button";
import type { ClauseOption } from "@/lib/clauses/types";
import { minutaRequestSchema, type MinutaFormValues, type MinutaRequest } from "@/lib/minuta/schema";
import { WIZARD_STEPS } from "@/lib/minuta/wizardSteps";
import type { PersonaSummary } from "@/lib/personas/types";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

/** The wizard's topics, shown as sections of one page (the start and the review have no fields of their own). */
const SECTIONS = WIZARD_STEPS.filter(
  (step): step is (typeof WIZARD_STEPS)[number] & { id: FieldStepId } => step.id !== "inicio" && step.id !== "revisao",
);

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

/** Every minuta field on one page, in the wizard's order; the wizard is the guided way over the same values. */
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
    const form = event.currentTarget;
    // The toggle can't be on for an empty library (e.g. emptied in another tab after it was checked).
    const result = minutaRequestSchema.safeParse({ ...values, useLibrary: values.useLibrary && librarySourceCount > 0 });
    if (!result.success) {
      setErrors(collectFieldErrors(result.error));
      // Bring the first problem into view; the fields mark themselves with aria-invalid.
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <details className="group rounded-lg border bg-card p-4 sm:p-6" open={Boolean(values.baseDocument)}>
        <summary className="cursor-pointer font-medium">Documento base (opcional)</summary>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Envie um contrato ou modelo que a nova minuta deve seguir.</p>
        <BaseDocumentField
          value={values.baseDocument}
          error={errors["baseDocument.text"]}
          disabled={isSubmitting}
          onChange={(baseDocument) => update({ baseDocument })}
        >
          {baseDocumentExtras}
        </BaseDocumentField>
      </details>

      {SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`secao-${section.id}`}
          className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6"
        >
          <header className="flex flex-col gap-0.5">
            <h2 id={`secao-${section.id}`} className="font-semibold">
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </header>
          <MinutaStepFields
            step={section.id}
            values={values}
            onChange={update}
            errors={errors}
            disabled={isSubmitting}
            personas={personas}
            clauses={clauses}
            librarySourceCount={librarySourceCount}
          />
        </section>
      ))}

      <div className="sticky bottom-0 -mx-1 flex justify-end border-t bg-background/90 px-1 py-3 backdrop-blur">
        <Button type="submit" size="lg" disabled={isSubmitting || isBusy}>
          {isSubmitting || isBusy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
