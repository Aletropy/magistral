"use client";

import { CircleX } from "lucide-react";
import { FollowedTaskStatus } from "@/components/tasks/FollowedTaskStatus";
import { Button } from "@/components/ui/button";
import { useBackgroundTask } from "@/hooks/useBackgroundTask";
import { LIBRARY_SYNC_ENDPOINT } from "@/lib/http/endpoints";
import { librarySyncResultSchema, type FolderSyncReport } from "@/lib/rag/taskResults";
import type { TaskDetail } from "@/lib/tasks/types";
import { plural } from "@/lib/text/plural";

const SYNC_FAILED = "Não foi possível sincronizar a pasta. Tente novamente.";

function summarize(report: FolderSyncReport): string {
  return [
    plural(report.added.length, "adicionado", "adicionados"),
    plural(report.updated.length, "atualizado", "atualizados"),
    plural(report.removed.length, "removido", "removidos"),
    `${report.unchanged} sem mudança`,
    report.duplicates.length > 0 && plural(report.duplicates.length, "duplicado ignorado", "duplicados ignorados"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function LibrarySyncPanel({ folder, initialTask }: { folder: string; initialTask: TaskDetail | null }) {
  const background = useBackgroundTask(librarySyncResultSchema, initialTask);
  const { isBusy, startError, result } = background;
  const report = result?.report ?? null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">Pasta local</h2>
      <p className="text-xs text-muted-foreground">
        Coloque PDFs e DOCX em <code className="rounded bg-muted px-1 py-0.5">{folder}</code> (subpastas
        valem) e sincronize. Arquivos novos são indexados, alterados são reindexados e apagados saem da
        biblioteca. O tipo é deduzido do nome (lei, decreto, parecer).
      </p>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={isBusy}
        onClick={() => void background.start(() => fetch(LIBRARY_SYNC_ENDPOINT, { method: "POST" }), SYNC_FAILED)}
      >
        {isBusy ? "Sincronizando em segundo plano…" : "Sincronizar pasta"}
      </Button>
      {startError && <p className="text-sm text-destructive">{startError}</p>}
      <FollowedTaskStatus background={background} runningTitle="Sincronizando a pasta" />
      {report && (
        <div className="flex flex-col gap-1 text-sm">
          <p>{summarize(report)}</p>
          {report.failed.map((failure) => (
            <p key={failure.path} className="flex items-start gap-1.5 text-destructive">
              <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {failure.path} — {failure.message}
              </span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
