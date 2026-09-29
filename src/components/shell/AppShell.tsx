"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { NotificationBell } from "@/components/activity/NotificationBell";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import type { CurrentUser } from "@/lib/auth/types";
import { formatVersion, type ReleaseInfo } from "@/lib/config/release";
import { HOME_PATH } from "@/lib/minutas/paths";
import { SidebarNav } from "./SidebarNav";

const MAIN_CONTENT_ID = "conteudo";
const DRAWER_ID = "menu-principal";

/**
 * The signed-in frame: a grouped sidebar on wide screens, a drawer on phones and tablets, and a top bar
 * with notifications, theme and the user's menu.
 */
interface AppShellProps {
  user: CurrentUser;
  release: ReleaseInfo;
  children: ReactNode;
}

export function AppShell({ user, release, children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => setIsDrawerOpen(false);

  // A navigation (including back/forward) closes the drawer.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setIsDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const menuButton = menuButtonRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [isDrawerOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeDrawer();
  }

  return (
    <div className="flex min-h-full flex-1">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r bg-sidebar lg:block">
        <SidebarNav user={user} />
      </aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onKeyDown={handleDrawerKeyDown}>
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeDrawer}
          />
          <div
            id={DRAWER_ID}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r bg-sidebar shadow-xl"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              aria-label="Fechar menu"
              onClick={closeDrawer}
            >
              <X aria-hidden />
            </Button>
            <SidebarNav user={user} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={isDrawerOpen}
            aria-controls={DRAWER_ID}
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
          <Link href={HOME_PATH} className="font-semibold tracking-tight lg:hidden">
            Magistral
          </Link>
          {release.isTestRelease && (
            <Badge variant="outline" className="border-warning-border bg-warning text-warning-foreground">
              Versão de teste
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            <FeedbackButton />
            <NotificationBell />
            <ThemeToggle />
            <UserMenu user={user} version={formatVersion(release)} />
          </div>
        </header>
        <div id={MAIN_CONTENT_ID} className="flex flex-1 flex-col" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
