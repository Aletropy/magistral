"use client";

import { useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";
import { useReviewPersistence } from "@/hooks/useReviewPersistence";
import type { MinutaResponseBody } from "@/lib/http/contracts";

/** A minuta from the history, with the same export, review and source panels as right after generating. */
export function SavedMinutaView({ initial }: { initial: MinutaResponseBody }) {
  const [minuta, setMinuta] = useState(initial);
  const { persist, saveError } = useReviewPersistence();

  function handleReviewApplied(markdown: string) {
    setMinuta((previous) => ({ ...previous, markdown }));
    void persist(minuta.id, markdown);
  }

  return (
    <div className="flex flex-col gap-3">
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      <ResultPanel result={minuta} isLoading={false} error={null} onReviewApplied={handleReviewApplied} />
    </div>
  );
}
