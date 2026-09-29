"use client";

import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PANEL_ID } from "./AssistantPanel";
import { useAssistantPanel } from "./AssistantProvider";

/** Opens the Advogado IA beside the page; `label` replaces the default text (e.g. in the wizard). */
export function AssistantButton({ label = "Advogado IA" }: { label?: string }) {
  const { isOpen, isAvailable, toggle } = useAssistantPanel();
  if (!isAvailable) return null;
  return (
    <Button
      type="button"
      variant={isOpen ? "secondary" : "ghost"}
      size="sm"
      aria-expanded={isOpen}
      aria-controls={PANEL_ID}
      aria-keyshortcuts="Control+K Meta+K"
      title="Advogado IA (Ctrl+K)"
      onClick={toggle}
    >
      <MessagesSquare aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <kbd className="hidden rounded border bg-muted px-1 font-sans text-[10px] text-muted-foreground lg:inline">Ctrl K</kbd>
    </Button>
  );
}
