"use client";

import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CLAUSES_CHARS } from "@/lib/minuta/schema";

const CLAUSES_ROWS = 6;

interface ClausesTextFieldProps {
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (clauses: string) => void;
}

/** Free-text specific clauses: deadlines, amounts, penalties, venue. */
export function ClausesTextField({ value, error, disabled, onChange }: ClausesTextFieldProps) {
  return (
    <FormField
      label="Cláusulas específicas (opcional)"
      htmlFor="clauses"
      error={error}
      hint={`${value.length}/${MAX_CLAUSES_CHARS} caracteres. Descreva prazos, valores, multas, foro…`}
    >
      <Textarea
        id="clauses"
        rows={CLAUSES_ROWS}
        maxLength={MAX_CLAUSES_CHARS}
        disabled={disabled}
        placeholder="Ex.: Pagamento mensal de R$ 5.000 até o dia 10; multa de 2% por atraso; foro de São Paulo."
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}
