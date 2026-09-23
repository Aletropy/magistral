"use client";

import { MinutaForm } from "@/components/MinutaForm";
import { ResultPanel } from "@/components/ResultPanel";
import { useMinutaGeneration } from "@/hooks/useMinutaGeneration";

export function MinutaStudio() {
  const { markdown, isGenerating, error, generate } = useMinutaGeneration();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <MinutaForm isSubmitting={isGenerating} onSubmit={generate} />
      <ResultPanel markdown={markdown} isGenerating={isGenerating} error={error} />
    </div>
  );
}
