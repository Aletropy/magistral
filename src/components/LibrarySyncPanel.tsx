"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLibraryActions } from "@/hooks/useLibraryActions";
import type { LibrarySyncResponseBody } from "@/lib/http/api";
import type { FolderSyncReport } from "@/lib/rag/syncFolder";
import { plural } from "@/lib/text/plural";

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

export function LibrarySyncPanel({ folder }: { folder: string }) {
  const router = useRouter();
  const [report, setReport] = useState<FolderSyncReport | null>(null);
  const { isPending, error, sync } = useLibraryActions();

  async function handleSync() {
    const body = await sync<LibrarySyncResponseBody>();
    if (!body) return;
    setReport(body.report);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">Pasta local</h2>
      <p className="text-xs text-muted-foreground">
        Coloque PDFs e DOCX em <code className="rounded bg-muted px-1 py-0.5">{folder}</code> (subpastas
        valem) e sincronize. Arquivos novos são indexados, alterados são reindexados e apagados saem da
        biblioteca. O tipo é deduzido do nome (lei, decreto, parecer).
      </p>
      <Button type="button" variant="outline" className="self-start" disabled={isPending} onClick={handleSync}>
        {isPending ? "Sincronizando…" : "Sincronizar pasta"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {report && (
        <div className="flex flex-col gap-1 text-sm">
          <p>{summarize(report)}</p>
          {report.failed.map((failure) => (
            <p key={failure.path} className="text-destructive">
              ✗ {failure.path} — {failure.message}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
