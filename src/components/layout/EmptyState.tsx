import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** What to do next, e.g. a button that creates the first item. */
  action?: ReactNode;
}

/** What a list shows before it has anything: what belongs here and how to add the first one. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  );
}
