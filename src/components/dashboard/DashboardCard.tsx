import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}

/** One panel of the dashboard, with a link to the page that has the full list. */
export function DashboardCard({ title, href, linkLabel, children }: DashboardCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5" aria-label={title}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {href && linkLabel && (
          <Link href={href} className="flex items-center gap-1 text-sm text-primary hover:underline">
            {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
