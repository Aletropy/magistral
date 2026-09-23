"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { usePersonaMutations } from "@/hooks/usePersonaMutations";
import { personaEditPath } from "@/lib/personas/paths";
import type { PersonaInput } from "@/lib/personas/schema";
import type { StyleCaptureResult } from "@/lib/style/styleCaptureResult";

export interface EditablePersona {
  id: string;
  input: PersonaInput;
}

interface ApplyStyleToPersonaProps {
  personas: EditablePersona[];
  capture: StyleCaptureResult;
}

/** Replaces an existing persona's style profile and examples with the captured ones, keeping everything else. */
export function ApplyStyleToPersona({ personas, capture }: ApplyStyleToPersonaProps) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(personas[0]?.id ?? "");
  const { isPending, error, save } = usePersonaMutations();

  async function handleApply() {
    const target = personas.find((persona) => persona.id === targetId);
    if (!target) return;
    const input = { ...target.input, styleProfile: capture.profile, examples: capture.excerpts };
    if (await save(input, target.id)) router.push(personaEditPath(target.id));
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">Aplicar a uma persona existente</h2>
      <p className="text-xs text-muted-foreground">
        Substitui o perfil de estilo e os exemplos da persona escolhida. Nome, regras de tom, termos
        proibidos e ajustes continuam como estão.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Persona de destino"
          className={`${NATIVE_SELECT_CLASS} max-w-xs`}
          disabled={isPending}
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.input.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" disabled={isPending || !targetId} onClick={handleApply}>
          {isPending ? "Aplicando…" : "Aplicar estilo"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
