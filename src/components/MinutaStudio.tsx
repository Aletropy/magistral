"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MinutaForm } from "@/components/MinutaForm";
import { ResultPanel } from "@/components/ResultPanel";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { useMinutaGeneration, type MinutaGenerationInitialState } from "@/hooks/useMinutaGeneration";
import { useReviewPersistence } from "@/hooks/useReviewPersistence";
import type { ClauseOption } from "@/lib/clauses/types";
import { minutaPath } from "@/lib/minutas/paths";
import type { PersonaSummary } from "@/lib/personas/types";

interface MinutaStudioProps {
  personas: PersonaSummary[];
  clauses: ClauseOption[];
  librarySourceCount: number;
  initialGeneration?: MinutaGenerationInitialState;
}

export function MinutaStudio({ personas, clauses, librarySourceCount, initialGeneration }: MinutaStudioProps) {
  const { background, result, isWorking, showTaskStatus, isLoadingResult, error, generate, replaceMarkdown } =
    useMinutaGeneration(initialGeneration);
  const { persist, saveError } = useReviewPersistence();
  const resultRef = useRef<HTMLDivElement>(null);
  const resultId = result?.id;

  // On phones the result sits below the long form; bring it into view once it arrives.
  useEffect(() => {
    if (resultId) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultId]);

  function handleReviewApplied(markdown: string) {
    replaceMarkdown(markdown);
    if (resultId) void persist(resultId, markdown);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <MinutaForm
        personas={personas}
        clauses={clauses}
        librarySourceCount={librarySourceCount}
        isSubmitting={isWorking}
        submittingLabel="Gerando em segundo plano…"
        onSubmit={(request) => void generate(request)}
      />
      <div ref={resultRef} className="flex scroll-mt-4 flex-col gap-3">
        {result && !isWorking && (
          <p className="text-sm text-muted-foreground">
            Salva no{" "}
            <Link href={minutaPath(result.id)} className="text-primary hover:underline">
              histórico
            </Link>
            . Revisões aplicadas também ficam salvas.
          </p>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {showTaskStatus ? (
          <>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <FollowedTaskStatus background={background} runningTitle="Redigindo a minuta" />
          </>
        ) : (
          <ResultPanel result={result} isLoading={isLoadingResult} error={error} onReviewApplied={handleReviewApplied} />
        )}
      </div>
    </div>
  );
}
