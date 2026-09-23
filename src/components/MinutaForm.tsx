"use client";

import { useState, type FormEvent } from "react";
import { ApprovedClausesField } from "@/components/ApprovedClausesField";
import type { ClauseOption } from "@/lib/clauses/types";
import { LibraryToggle } from "@/components/LibraryToggle";
import { PartiesField } from "@/components/PartiesField";
import { PersonaSelector } from "@/components/PersonaSelector";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import {
  DEFAULT_DOCUMENT_TYPE_ID,
  DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_LABELS,
  OTHER_DOCUMENT_TYPE_ID,
  type DocumentTypeId,
} from "@/lib/minuta/documentTypes";
import {
  MAX_CLAUSES_CHARS,
  MAX_CUSTOM_DOCUMENT_TYPE_CHARS,
  minutaRequestSchema,
  type MinutaFormValues,
  type MinutaRequest,
} from "@/lib/minuta/schema";
import { DEFAULT_PERSONA_ID } from "@/lib/personas/seeds";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";
import type { PersonaSummary } from "@/lib/personas/types";

const CLAUSES_ROWS = 6;

function initialValues(personas: PersonaSummary[]): MinutaFormValues {
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
  };
}

interface MinutaFormProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  /** Button text; the batch creator reuses the form to build its template. */
  submitLabel?: string;
  submittingLabel?: string;
  isSubmitting: boolean;
  onSubmit: (request: MinutaRequest) => void;
}

export function MinutaForm({
  personas,
  clauses,
  librarySourceCount,
  submitLabel = "Gerar minuta",
  submittingLabel = "Gerando minuta…",
  isSubmitting,
  onSubmit,
}: MinutaFormProps) {
  const [values, setValues] = useState<MinutaFormValues>(() => initialValues(personas));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof MinutaFormValues>(field: K, value: MinutaFormValues[K]) {
    setValues((previous) => ({ ...previous, [field]: value }));
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
      <FormField label="Tipo de documento" htmlFor="documentType" error={errors.documentType}>
        <select
          id="documentType"
          className={NATIVE_SELECT_CLASS}
          disabled={isSubmitting}
          value={values.documentType}
          onChange={(event) => update("documentType", event.target.value as DocumentTypeId)}
        >
          {DOCUMENT_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {DOCUMENT_TYPE_LABELS[id]}
            </option>
          ))}
        </select>
      </FormField>

      {values.documentType === OTHER_DOCUMENT_TYPE_ID && (
        <FormField label="Qual documento?" htmlFor="customDocumentType" error={errors.customDocumentType}>
          <Input
            id="customDocumentType"
            placeholder="Ex.: Termo de Cessão de Direitos Autorais"
            maxLength={MAX_CUSTOM_DOCUMENT_TYPE_CHARS}
            disabled={isSubmitting}
            value={values.customDocumentType}
            aria-invalid={Boolean(errors.customDocumentType)}
            onChange={(event) => update("customDocumentType", event.target.value)}
          />
        </FormField>
      )}

      <PartiesField
        parties={values.parties}
        errors={errors}
        disabled={isSubmitting}
        onChange={(parties) => update("parties", parties)}
      />

      <ApprovedClausesField
        clauses={clauses}
        documentType={values.documentType}
        value={values.approvedClauseIds}
        error={errors.approvedClauseIds}
        disabled={isSubmitting}
        onChange={(approvedClauseIds) => update("approvedClauseIds", approvedClauseIds)}
      />

      <FormField
        label="Cláusulas específicas (opcional)"
        htmlFor="clauses"
        error={errors.clauses}
        hint={`${values.clauses.length}/${MAX_CLAUSES_CHARS} caracteres. Descreva prazos, valores, multas, foro…`}
      >
        <Textarea
          id="clauses"
          rows={CLAUSES_ROWS}
          maxLength={MAX_CLAUSES_CHARS}
          disabled={isSubmitting}
          placeholder="Ex.: Pagamento mensal de R$ 5.000 até o dia 10; multa de 2% por atraso; foro de São Paulo."
          value={values.clauses}
          aria-invalid={Boolean(errors.clauses)}
          onChange={(event) => update("clauses", event.target.value)}
        />
      </FormField>

      <PersonaSelector
        personas={personas}
        value={values.persona}
        error={errors.persona}
        disabled={isSubmitting}
        onChange={(persona) => update("persona", persona)}
      />

      <LibraryToggle
        checked={values.useLibrary}
        sourceCount={librarySourceCount}
        disabled={isSubmitting}
        onChange={(useLibrary) => update("useLibrary", useLibrary)}
      />

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
