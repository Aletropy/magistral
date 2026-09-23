import type { BatchJobSummary } from "@/lib/batch/types";

/** Done and failed shares of a job, with the counts spelled out so progress never relies on color alone. */
export function BatchProgressBar({ job }: { job: Pick<BatchJobSummary, "total" | "counts"> }) {
  const percent = (count: number) => (job.total === 0 ? 0 : (count / job.total) * 100);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={job.total}
        aria-valuenow={job.counts.done + job.counts.failed}
      >
        <div className="bg-primary" style={{ width: `${percent(job.counts.done)}%` }} />
        <div className="bg-destructive" style={{ width: `${percent(job.counts.failed)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {job.counts.done} de {job.total} prontas
        {job.counts.failed > 0 && ` · ${job.counts.failed} com falha`}
        {job.counts.running > 0 && ` · ${job.counts.running} gerando`}
      </span>
    </div>
  );
}
