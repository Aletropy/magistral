"use client";

import { useEffect } from "react";
import type { PageContextKind } from "@/lib/assistant/pageContext";
import { useAssistantPanel } from "./AssistantProvider";

interface AssistantContextProps {
  kind: PageContextKind;
  id?: string | null;
  /** A few words on where the user is on the page, e.g. the wizard step. */
  detail?: string;
}

/** Tells the assistant panel what this page shows, so “esta minuta” means the one open. Renders nothing. */
export function AssistantContext({ kind, id = null, detail = "" }: AssistantContextProps) {
  const { register } = useAssistantPanel();
  useEffect(() => register({ kind, id, detail }), [register, kind, id, detail]);
  return null;
}
