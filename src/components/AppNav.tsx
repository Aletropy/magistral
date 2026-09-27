"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { NotificationBell } from "@/components/activity/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { TEAM_PATH } from "@/lib/auth/paths";
import { isAdmin, type CurrentUser } from "@/lib/auth/types";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { HISTORY_PATH, HOME_PATH } from "@/lib/minutas/paths";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { USAGE_PATH } from "@/lib/usage/paths";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_LINKS: readonly NavLink[] = [
  { href: HOME_PATH, label: "Gerar minuta" },
  { href: ASSISTANT_PATH, label: "Advogado IA" },
  { href: HISTORY_PATH, label: "Histórico" },
  { href: PERSONAS_PATH, label: "Personas" },
  { href: LIBRARY_PATH, label: "Biblioteca" },
  { href: CLAUSES_PATH, label: "Cláusulas" },
  { href: BATCHES_PATH, label: "Lotes" },
  { href: TASKS_PATH, label: "Tarefas" },
  { href: USAGE_PATH, label: "Uso", adminOnly: true },
  { href: TEAM_PATH, label: "Equipe", adminOnly: true },
];

const MOBILE_MENU_ID = "menu-principal";

function isActive(pathname: string, href: string): boolean {
  return href === HOME_PATH ? pathname === HOME_PATH : pathname.startsWith(href);
}

const LINK_CLASS = cn(
  "block whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
  "aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary",
);

interface NavLinksProps {
  links: readonly NavLink[];
  pathname: string;
  onNavigate?: () => void;
  className: string;
}

function NavLinks({ links, pathname, onNavigate, className }: NavLinksProps) {
  return (
    <ul className={className}>
      {links.map(({ href, label }) => (
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

/** Inline links on wide screens; a menu button with a vertical panel on phones, tablets and small laptops. */
export function AppNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const links = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin(user));
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
        <NavLinks links={links} pathname={pathname} className="hidden gap-1 xl:flex" />
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu user={user} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="xl:hidden"
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
        <div id={MOBILE_MENU_ID} className="border-t px-4 py-2 xl:hidden">
          <NavLinks links={links} pathname={pathname} onNavigate={closeMenu} className="flex flex-col gap-1" />
        </div>
      )}
    </nav>
  );
}
