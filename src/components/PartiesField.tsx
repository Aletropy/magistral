"use client";

import { FormField, errorIdFor } from "@/components/ui/FormField";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  MAX_PARTIES,
  MAX_PARTY_QUALIFICATION_CHARS,
  MIN_PARTIES,
  type Party,
} from "@/lib/minuta/schema";

const EMPTY_PARTY: Party = { name: "", role: "", qualification: "" };
const QUALIFICATION_ROWS = 2;

interface PartiesFieldProps {
  parties: Party[];
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (parties: Party[]) => void;
}

export function PartiesField({ parties, errors, disabled, onChange }: PartiesFieldProps) {
  function updateParty(index: number, changes: Partial<Party>) {
    onChange(parties.map((party, i) => (i === index ? { ...party, ...changes } : party)));
  }

  function removeParty(index: number) {
    onChange(parties.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium text-zinc-800">Partes envolvidas</legend>
      {parties.map((party, index) => {
        const fieldId = (field: keyof Party) => `party-${index}-${field}`;
        const errorFor = (field: keyof Party) => errors[`parties.${index}.${field}`];

        return (
          <div key={index} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Parte {index + 1}
              </span>
              <button
                type="button"
                className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:invisible"
                disabled={parties.length <= MIN_PARTIES}
                onClick={() => removeParty(index)}
              >
                Remover
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Nome ou razão social" htmlFor={fieldId("name")} error={errorFor("name")}>
                <input
                  id={fieldId("name")}
                  className={INPUT_CLASS}
                  value={party.name}
                  aria-invalid={Boolean(errorFor("name"))}
                  aria-describedby={errorFor("name") ? errorIdFor(fieldId("name")) : undefined}
                  onChange={(event) => updateParty(index, { name: event.target.value })}
                />
              </FormField>
              <FormField label="Papel no documento" htmlFor={fieldId("role")} error={errorFor("role")}>
                <input
                  id={fieldId("role")}
                  className={INPUT_CLASS}
                  placeholder="Ex.: Contratante"
                  value={party.role}
                  aria-invalid={Boolean(errorFor("role"))}
                  aria-describedby={errorFor("role") ? errorIdFor(fieldId("role")) : undefined}
                  onChange={(event) => updateParty(index, { role: event.target.value })}
                />
              </FormField>
            </div>
            <FormField
              label="Qualificação (opcional)"
              htmlFor={fieldId("qualification")}
              error={errorFor("qualification")}
              hint="CPF/CNPJ, endereço, representante legal…"
            >
              <textarea
                id={fieldId("qualification")}
                className={INPUT_CLASS}
                rows={QUALIFICATION_ROWS}
                maxLength={MAX_PARTY_QUALIFICATION_CHARS}
                value={party.qualification}
                aria-invalid={Boolean(errorFor("qualification"))}
                onChange={(event) => updateParty(index, { qualification: event.target.value })}
              />
            </FormField>
          </div>
        );
      })}
      {errors.parties && <p className="text-xs text-red-600">{errors.parties}</p>}
      <button
        type="button"
        className={`${SECONDARY_BUTTON_CLASS} self-start`}
        disabled={parties.length >= MAX_PARTIES}
        onClick={() => onChange([...parties, EMPTY_PARTY])}
      >
        + Adicionar parte
      </button>
    </fieldset>
  );
}
