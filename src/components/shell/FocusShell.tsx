"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AssistantButton } from "@/components/assistant/AssistantButton";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { HOME_PATH } from "@/lib/minutas/paths";
import { BRAND_ICON } from "./navigation";

export const MAIN_CONTENT_ID = "conteudo";

/**
 * The frame of task pages that deserve the whole screen (the minuta wizard): no sidebar, only the brand
 * and a way out. The unsent draft stays saved in the browser, so leaving loses nothing.
 */
export function FocusShell({ exitLabel, children }: { exitLabel: string; children: ReactNode }) {
  const BrandIcon = BRAND_ICON;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
        <Link href={HOME_PATH} className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BrandIcon className="size-4" aria-hidden />
          </span>
          Magistral
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <AssistantButton label="Pedir ajuda" />
          <FeedbackButton />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href={HOME_PATH}>
              <X aria-hidden /> {exitLabel}
            </Link>
          </Button>
        </div>
      </header>
      <div id={MAIN_CONTENT_ID} className="flex flex-1 flex-col" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
