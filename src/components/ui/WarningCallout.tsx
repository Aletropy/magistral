import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** An amber notice that stays legible in light and dark themes. */
export function WarningCallout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-md border border-warning-border bg-warning px-4 py-3 text-sm text-warning-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
