"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildClausesFromConditions, type WizardConditions } from "@/lib/minuta/conditions";
import type { DocumentTypeId } from "@/lib/minuta/documentTypes";
import { DOCUMENT_TYPE_PRESETS } from "@/lib/minuta/documentTypePresets";
import { MAX_CLAUSES_CHARS } from "@/lib/minuta/schema";

const EXTRA_ROWS = 4;

interface ConditionsFieldProps {
  documentType: DocumentTypeId;
  conditions: WizardConditions;
  error?: string;
  disabled: boolean;
  onChange: (conditions: WizardConditions) => void;
}

/** The chosen type's essential questions, one field each, plus a box for anything else. */
export function ConditionsField({ documentType, conditions, error, disabled, onChange }: ConditionsFieldProps) {
  const { questions } = DOCUMENT_TYPE_PRESETS[documentType];
  const length = buildClausesFromConditions(documentType, conditions).length;

  function answer(id: string, value: string) {
    onChange({ ...conditions, answers: { ...conditions.answers, [id]: value } });
  }

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="sr-only">Condições essenciais</legend>
      {questions.map((question) => (
        <FormField key={question.id} label={question.label} htmlFor={`condicao-${question.id}`}>
          <Input
            id={`condicao-${question.id}`}
            placeholder={question.placeholder}
            value={conditions.answers[question.id] ?? ""}
            onChange={(event) => answer(question.id, event.target.value)}
          />
        </FormField>
      ))}
      <FormField
        label="Outras condições (opcional)"
        htmlFor="condicao-outras"
        error={error}
        hint={`${length}/${MAX_CLAUSES_CHARS} caracteres no total.`}
      >
        <Textarea
          id="condicao-outras"
          rows={EXTRA_ROWS}
          placeholder="Qualquer outro pedido para a minuta."
          value={conditions.extra}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange({ ...conditions, extra: event.target.value })}
        />
      </FormField>
    </fieldset>
  );
}
