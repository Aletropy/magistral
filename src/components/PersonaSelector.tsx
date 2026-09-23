"use client";

import { PERSONA_LIST, type PersonaId } from "@/lib/personas/catalog";

interface PersonaSelectorProps {
  value: PersonaId;
  error?: string;
  disabled: boolean;
  onChange: (persona: PersonaId) => void;
}

export function PersonaSelector({ value, error, disabled, onChange }: PersonaSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium text-zinc-800">Personalidade (tom de voz)</legend>
      {PERSONA_LIST.map((persona) => (
        <label
          key={persona.id}
          className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition has-checked:border-indigo-500 has-checked:bg-indigo-50 has-checked:ring-1 has-checked:ring-indigo-500"
        >
          <input
            type="radio"
            name="persona"
            className="mt-1 accent-indigo-600"
            value={persona.id}
            checked={value === persona.id}
            onChange={() => onChange(persona.id)}
          />
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900">{persona.label}</span>
            <span className="text-xs text-zinc-600">{persona.description}</span>
          </span>
        </label>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
