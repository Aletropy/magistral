import type { NotificationDraft } from "@/lib/notifications/types";
import { plural } from "@/lib/text/plural";
import { batchPath } from "./paths";
import type { BatchJobSummary } from "./types";

/** The notification for a batch that has nothing left to draft. */
export function describeFinishedJob(job: BatchJobSummary): NotificationDraft {
  const { done, failed } = job.counts;
  const parts = [plural(done, "minuta pronta", "minutas prontas")];
  if (failed > 0) parts.push(plural(failed, "com falha", "com falha"));
  return {
    level: failed > 0 ? "error" : "success",
    title: `Lote concluído: ${job.name}`,
    body: `${parts.join(", ")}.`,
    href: batchPath(job.id),
  };
}
