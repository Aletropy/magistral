"use client";

import { FlaskConical, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isAdmin, type CurrentUser } from "@/lib/auth/types";
import { DESENVOLVIMENTO_PATH } from "@/lib/desenvolvimento/paths";
import { INTEGRATIONS_PATH } from "@/lib/integrations/paths";
import { HOME_PATH } from "@/lib/minutas/paths";
import { USAGE_PATH } from "@/lib/usage/paths";
import type { PinScope } from "@/lib/pinCookies";
import { cn } from "@/lib/utils";
import { BRAND_ICON, NAV_GROUPS, isActiveLink } from "./navigation";
import { SystemPinDialog } from "./SystemPinDialog";

const LINK_CLASS = cn(
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/75 transition",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary",
);

interface SidebarNavProps {
  user: CurrentUser;
  /** The Sistema group stays behind the office PIN while locked. */
  systemLocked: boolean;
  /** Desenvolvimento (Uso, Integrações) stays behind its own PIN while locked. */
  devLocked: boolean;
  /** Called after following a link, so the phone drawer closes. */
  onNavigate?: () => void;
}

/** The brand and the grouped links; admin-only links are left out for everyone else. */
export function SidebarNav({ user, systemLocked, devLocked, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const BrandIcon = BRAND_ICON;
  const [pinScope, setPinScope] = useState<PinScope | null>(null);
  const admin = isAdmin(user);
  const devActive =
    pathname === DESENVOLVIMENTO_PATH || pathname === USAGE_PATH || pathname === INTEGRATIONS_PATH;
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href={HOME_PATH} className="flex items-center gap-2 px-2.5 font-semibold tracking-tight" onClick={onNavigate}>
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BrandIcon className="size-4" aria-hidden />
        </span>
        Magistral
      </Link>
      <nav aria-label="Principal" className="flex flex-col gap-5">
        {NAV_GROUPS.map((group) => {
          if (group.label === "Sistema" && systemLocked) {
            return (
              <div key="sistema-bloqueado" className="flex flex-col gap-1">
                <ul className="flex flex-col gap-0.5">
                  <li>
                    <button type="button" onClick={() => setPinScope("sistema")} className={LINK_CLASS}>
                      <Lock className="size-4 shrink-0" aria-hidden />
                      Área restrita
                    </button>
                  </li>
                </ul>
              </div>
            );
          }
          if (group.label === "Sistema") {
            const links = group.links.filter((link) => !link.adminOnly || admin);
            return (
              <div key="sistema" className="flex flex-col gap-1">
                <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Sistema</p>
                <ul className="flex flex-col gap-0.5">
                  {links.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActiveLink(pathname, href) ? "page" : undefined}
                        className={LINK_CLASS}
                        onClick={onNavigate}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  ))}
                  {admin && (
                    <li>
                      {devLocked ? (
                        <button type="button" onClick={() => setPinScope("desenvolvimento")} className={LINK_CLASS}>
                          <Lock className="size-4 shrink-0" aria-hidden />
                          Desenvolvimento
                        </button>
                      ) : (
                        <Link
                          href={DESENVOLVIMENTO_PATH}
                          aria-current={devActive ? "page" : undefined}
                          className={LINK_CLASS}
                          onClick={onNavigate}
                        >
                          <FlaskConical className="size-4 shrink-0" aria-hidden />
                          Desenvolvimento
                        </Link>
                      )}
                    </li>
                  )}
                </ul>
              </div>
            );
          }
          const links = group.links.filter((link) => !link.adminOnly || isAdmin(user));
          if (links.length === 0) return null;
          return (
            <div key={group.label ?? "inicio"} className="flex flex-col gap-1">
              {group.label && (
                <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
              )}
              <ul className="flex flex-col gap-0.5">
                {links.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActiveLink(pathname, href) ? "page" : undefined}
                      className={LINK_CLASS}
                      onClick={onNavigate}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <SystemPinDialog open={pinScope !== null} scope={pinScope ?? "sistema"} onClose={() => setPinScope(null)} />
    </div>
  );
}
