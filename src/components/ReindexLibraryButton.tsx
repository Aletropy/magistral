"use client";

import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { LIBRARY_REINDEX_ENDPOINT } from "@/lib/http/api";
import { libraryReindexResultSchema } from "@/lib/rag/taskResults";
import type { TaskDetail } from "@/lib/tasks/types";

const REINDEX_FAILED = "Não foi possível reindexar a biblioteca. Tente novamente.";

export function ReindexLibraryButton({ initialTask }: { initialTask: TaskDetail | null }) {
  const background = useBackgroundTask(libraryReindexResultSchema, initialTask);
  const { isBusy, startError } = background;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={() => void background.start(() => fetch(LIBRARY_REINDEX_ENDPOINT, { method: "POST" }), REINDEX_FAILED)}
      >
        {isBusy ? "Reindexando em segundo plano…" : "Reindexar biblioteca"}
      </Button>
      {startError && <p className="text-sm text-destructive">{startError}</p>}
      <div className="w-full">
        <FollowedTaskStatus background={background} runningTitle="Reindexando a biblioteca" />
      </div>
    </div>
  );
}
