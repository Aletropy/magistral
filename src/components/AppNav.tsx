"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { HISTORY_PATH, HOME_PATH } from "@/lib/minutas/paths";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { USAGE_PATH } from "@/lib/usage/paths";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: HOME_PATH, label: "Gerar minuta" },
  { href: HISTORY_PATH, label: "Histórico" },
  { href: PERSONAS_PATH, label: "Personas" },
  { href: LIBRARY_PATH, label: "Biblioteca" },
  { href: CLAUSES_PATH, label: "Cláusulas" },
  { href: BATCHES_PATH, label: "Lotes" },
  { href: USAGE_PATH, label: "Uso" },
] as const;

const MOBILE_MENU_ID = "menu-principal";

function isActive(pathname: string, href: string): boolean {
  return href === HOME_PATH ? pathname === HOME_PATH : pathname.startsWith(href);
}

const LINK_CLASS = cn(
  "block whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
  "aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary",
);

function NavLinks({ pathname, onNavigate, className }: { pathname: string; onNavigate?: () => void; className: string }) {
  return (
    <ul className={className}>
      {NAV_LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={LINK_CLASS}
            onClick={onNavigate}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Inline links on large screens; a menu button with a vertical panel on phones and tablets. */
export function AppNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") closeMenu();
  }

  return (
    <nav className="border-b bg-card" aria-label="Principal" onKeyDown={handleKeyDown}>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link href={HOME_PATH} className="py-3 font-semibold tracking-tight" onClick={closeMenu}>
          Magistral
        </Link>
        <NavLinks pathname={pathname} className="hidden gap-1 lg:flex" />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div id={MOBILE_MENU_ID} className="border-t px-4 py-2 lg:hidden">
          <NavLinks pathname={pathname} onNavigate={closeMenu} className="flex flex-col gap-1" />
        </div>
      )}
    </nav>
  );
}
