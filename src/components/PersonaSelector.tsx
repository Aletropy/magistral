"use client";

import Link from "next/link";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import type { PersonaSummary } from "@/lib/personas/types";

interface PersonaSelectorProps {
  personas: PersonaSummary[];
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (personaId: string) => void;
}

export function PersonaSelector({ personas, value, error, disabled, onChange }: PersonaSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium">
        Personalidade (tom de voz)
        <Link href={PERSONAS_PATH} className="text-xs font-normal text-primary hover:underline">
          Gerenciar personas
        </Link>
      </legend>
      {personas.map((persona) => (
        <label
          key={persona.id}
          className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3 transition has-checked:border-primary has-checked:bg-primary/5 has-checked:ring-1 has-checked:ring-primary"
        >
          <input
            type="radio"
            name="persona"
            className="mt-1 accent-primary"
            value={persona.id}
            checked={value === persona.id}
            onChange={() => onChange(persona.id)}
          />
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{persona.name}</span>
            {persona.description && (
              <span className="text-xs text-muted-foreground">{persona.description}</span>
            )}
          </span>
        </label>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}
