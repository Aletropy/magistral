"use client";

import type { ClauseOption } from "@/components/ApprovedClausesField";
import { MinutaForm } from "@/components/MinutaForm";
import { ResultPanel } from "@/components/ResultPanel";
import { useMinutaGeneration } from "@/hooks/useMinutaGeneration";
import type { PersonaSummary } from "@/lib/personas/types";

interface MinutaStudioProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
}

export function MinutaStudio({ personas, clauses, librarySourceCount }: MinutaStudioProps) {
  const { result, isGenerating, error, generate, replaceMarkdown } = useMinutaGeneration();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <MinutaForm
        personas={personas}
        clauses={clauses}
        librarySourceCount={librarySourceCount}
        isSubmitting={isGenerating}
        onSubmit={generate}
      />
      <ResultPanel result={result} isGenerating={isGenerating} error={error} onReviewApplied={replaceMarkdown} />
    </div>
  );
}
