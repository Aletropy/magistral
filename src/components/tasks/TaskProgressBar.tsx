import { Progress } from "@/components/ui/progress";
import type { TaskProgress } from "@/lib/tasks/types";

const PERCENT = 100;

/** A determinate bar when the task knows its total, an indeterminate pulse otherwise; the label is spelled out. */
export function TaskProgressBar({ progress }: { progress: TaskProgress | null }) {
  const total = progress?.total ?? null;
  const value = total && progress ? Math.min(PERCENT, (progress.current / total) * PERCENT) : null;

  return (
    <div className="flex flex-col gap-1">
      {value === null ? (
        <div className="h-1 w-full animate-pulse rounded-full bg-primary/40" role="progressbar" aria-busy />
      ) : (
        <Progress value={value} aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={Math.round(value)} />
      )}
      {progress?.label && <span className="text-xs text-muted-foreground">{progress.label}</span>}
    </div>
  );
}
