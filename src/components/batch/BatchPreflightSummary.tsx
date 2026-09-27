import { Clock } from "lucide-react";
import { WarningCallout } from "@/components/ui/WarningCallout";
import type { BatchPreflight } from "@/lib/batch/loadBatchPreflight";
import { plural } from "@/lib/text/plural";

const SECONDS_PER_MINUTE = 60;

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE));
  return minutes < SECONDS_PER_MINUTE
    ? plural(minutes, "minuto", "minutos")
    : `${Math.floor(minutes / SECONDS_PER_MINUTE)} h ${minutes % SECONDS_PER_MINUTE} min`;
}

/** Before a batch starts: about how long it will take, and whether today's free quota covers it. */
export function BatchPreflightSummary({ rows, preflight }: { rows: number; preflight: BatchPreflight }) {
  const { secondsPerMinuta, concurrency, dailyRequestLimit, requestsUsedToday } = preflight;
  const seconds = Math.ceil(rows / concurrency) * secondsPerMinuta;
  const remaining = dailyRequestLimit === null ? null : Math.max(0, dailyRequestLimit - requestsUsedToday);

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" aria-hidden />
        {plural(rows, "minuta", "minutas")}, {concurrency} por vez: cerca de {formatDuration(seconds)}.
      </p>
      {remaining !== null && rows > remaining && (
        <WarningCallout>
          O plano gratuito da IA permite {dailyRequestLimit} pedidos por dia e restam cerca de {remaining} hoje. As
          linhas além disso vão falhar; amanhã, use “Tentar falhas de novo” na página do lote.
        </WarningCallout>
      )}
    </div>
  );
}
