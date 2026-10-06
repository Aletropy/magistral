"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdmin, type CurrentUser } from "@/lib/auth/types";
import { HOME_PATH } from "@/lib/minutas/paths";
import { cn } from "@/lib/utils";
import { BRAND_ICON, NAV_GROUPS, isActiveLink } from "./navigation";

const LINK_CLASS = cn(
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/75 transition",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary",
);

interface SidebarNavProps {
  user: CurrentUser;
  /** Called after following a link, so the phone drawer closes. */
  onNavigate?: () => void;
}

/** The brand and the grouped links; admin-only links are left out for everyone else. */
export function SidebarNav({ user, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const BrandIcon = BRAND_ICON;
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
    </div>
  );
}
