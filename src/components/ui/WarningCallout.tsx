import { TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WarningCalloutProps {
  children: ReactNode;
  /** Layout of the content beside the icon (e.g. a column of paragraphs). */
  className?: string;
  icon?: LucideIcon;
}

/** An amber notice with an icon that stays legible in light and dark themes. */
export function WarningCallout({ children, className, icon: Icon = TriangleAlert }: WarningCalloutProps) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-md border border-warning-border bg-warning px-4 py-3 text-sm text-warning-foreground"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className={cn("min-w-0 flex-1", className)}>{children}</div>
    </div>
  );
}
