"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Gerar minuta" },
  { href: PERSONAS_PATH, label: "Personas" },
  { href: LIBRARY_PATH, label: "Biblioteca" },
  { href: CLAUSES_PATH, label: "Cláusulas" },
  { href: "/uso", label: "Uso" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 sm:px-8">
        <span className="py-3 font-semibold tracking-tight">Magistral</span>
        <ul className="flex gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  "aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
