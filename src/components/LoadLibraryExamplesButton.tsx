"use client";

import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { DEMO_LIBRARY_ENDPOINT } from "@/lib/http/api";
import { demoLibraryResultSchema } from "@/lib/rag/taskResults";
import type { TaskDetail } from "@/lib/tasks/types";

const LOAD_FAILED = "Não foi possível carregar os exemplos. Tente novamente.";

/** Indexes the fictitious example norms in the background (the first run also downloads the local model). */
export function LoadLibraryExamplesButton({ initialTask }: { initialTask: TaskDetail | null }) {
  const background = useBackgroundTask(demoLibraryResultSchema, initialTask);
  const { isBusy, startError } = background;

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={() => void background.start(() => fetch(DEMO_LIBRARY_ENDPOINT, { method: "POST" }), LOAD_FAILED)}
      >
        {isBusy ? "Indexando exemplos…" : "Carregar exemplos"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Na primeira vez, o modelo de busca (cerca de 190 MB) é baixado; pode levar alguns minutos. Você pode
        continuar usando o Magistral enquanto isso.
      </p>
      {startError && <p className="text-xs text-destructive">{startError}</p>}
      <div className="w-full">
        <FollowedTaskStatus background={background} runningTitle="Indexando as normas de exemplo" />
      </div>
    </div>
  );
}
