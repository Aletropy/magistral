import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-screen-2xl",
} as const;

export type PageWidth = keyof typeof WIDTHS;

interface PageProps {
  title: ReactNode;
  /** One or two sentences under the title saying what the page is for. */
  description?: ReactNode;
  /** Buttons for the page's main actions, beside the title on wide screens and under it on phones. */
  actions?: ReactNode;
  /** Small text above the title, e.g. the section or a back link. */
  eyebrow?: ReactNode;
  width?: PageWidth;
  children: ReactNode;
}

/** Every page's frame: the same margins, title block and spacing, so the app reads as one product. */
export function Page({ title, description, actions, eyebrow, width = "default", children }: PageProps) {
  return (
    <main className={cn("mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8", WIDTHS[width])}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
          {description && <div className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  );
}
