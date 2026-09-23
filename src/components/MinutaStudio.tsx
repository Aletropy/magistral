"use client";

import { MinutaForm } from "@/components/MinutaForm";
import { ResultPanel } from "@/components/ResultPanel";
import { useMinutaGeneration } from "@/hooks/useMinutaGeneration";
import type { PersonaSummary } from "@/lib/personas/types";

interface MinutaStudioProps {
  personas: PersonaSummary[];
}

export function MinutaStudio({ personas }: MinutaStudioProps) {
  const { markdown, forbiddenTermsFound, isGenerating, error, generate } = useMinutaGeneration();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <MinutaForm personas={personas} isSubmitting={isGenerating} onSubmit={generate} />
      <ResultPanel
        markdown={markdown}
        forbiddenTermsFound={forbiddenTermsFound}
        isGenerating={isGenerating}
        error={error}
      />
    </div>
  );
}
