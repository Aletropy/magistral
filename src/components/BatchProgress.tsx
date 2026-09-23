"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BatchProgressBar } from "@/components/BatchProgressBar";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBatchProgress } from "@/hooks/useBatchProgress";
import { useResourceMutations } from "@/hooks/useResourceMutations";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { BATCH_ITEM_STATUS_LABELS, type BatchItemStatus, type BatchJobDetail } from "@/lib/batch/types";
import { EXPORT_FORMATS, EXPORT_FORMAT_INFO } from "@/lib/export/formats";
import {
  BATCHES_ENDPOINT,
  NETWORK_ERROR_MESSAGE,
  batchDownloadEndpoint,
  batchEndpoint,
  batchRetryEndpoint,
  readErrorMessage,
} from "@/lib/http/api";

const STATUS_VARIANTS: Record<BatchItemStatus, "secondary" | "outline" | "default" | "destructive"> = {
  pending: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
};

const ENDPOINTS = { collection: BATCHES_ENDPOINT, item: batchEndpoint };
const MESSAGES = { saveFailed: "", deleteFailed: "Não foi possível excluir o lote. Tente novamente." };
const RETRY_FAILED = "Não foi possível recolocar as minutas na fila.";

export function BatchProgress({ initialJob }: { initialJob: BatchJobDetail }) {
  const router = useRouter();
  const { job, active, isStale, refresh } = useBatchProgress(initialJob);
  const { isPending, error, remove } = useResourceMutations<never>(ENDPOINTS, MESSAGES);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry() {
    setRetryError(null);
    try {
      const response = await fetch(batchRetryEndpoint(job.id), { method: "POST" });
      if (!response.ok) setRetryError(await readErrorMessage(response, RETRY_FAILED));
      await refresh();
    } catch {
      setRetryError(NETWORK_ERROR_MESSAGE);
    }
  }

  async function handleDelete() {
    if (await remove(job.id)) {
      router.push(BATCHES_PATH);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-64 flex-1">
          <BatchProgressBar job={job} />
        </div>
        {active && <span className="animate-pulse text-sm text-muted-foreground">Gerando em segundo plano…</span>}
        {isStale && <span className="text-sm text-destructive">Sem conexão com o servidor; tentando de novo.</span>}
        {retryError && <span className="text-sm text-destructive">{retryError}</span>}
        <div className="flex flex-wrap gap-2">
          {job.counts.failed > 0 && (
            <Button variant="outline" onClick={handleRetry}>
              Tentar novamente ({job.counts.failed} com falha)
            </Button>
          )}
          {EXPORT_FORMATS.map((format) =>
            job.counts.done > 0 ? (
              <Button key={format} asChild variant="outline">
                <a href={batchDownloadEndpoint(job.id, format)} download>
                  Baixar ZIP {EXPORT_FORMAT_INFO[format].label}
                </a>
              </Button>
            ) : (
              <Button key={format} variant="outline" disabled>
                Baixar ZIP {EXPORT_FORMAT_INFO[format].label}
              </Button>
            ),
          )}
          <ConfirmDeleteButton
            title={`Excluir o lote “${job.name}”?`}
            description="As minutas geradas e as pendentes serão apagadas. Uma minuta em geração agora é descartada ao terminar."
            isPending={isPending}
            error={error}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-right">Linha</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tentativas</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {job.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-right tabular-nums">{item.position}</TableCell>
                <TableCell className="font-medium">{item.label || "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[item.status]}>{BATCH_ITEM_STATUS_LABELS[item.status]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.attempts}</TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">
                  {item.error && (item.status === "pending" ? `Nova tentativa em breve: ${item.error}` : item.error)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
