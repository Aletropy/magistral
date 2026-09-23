"use client";

import { useMemo } from "react";
import { DocumentBlocks, type BlockStyles } from "@/components/markdown/DocumentBlocks";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

const CHAT_STYLES: BlockStyles = {
  headings: {
    1: "mt-2 mb-2 text-base font-semibold",
    2: "mt-3 mb-1.5 text-sm font-semibold",
    3: "mt-2 mb-1 text-sm font-semibold",
    4: "mt-2 mb-1 text-sm font-medium",
  },
  paragraph: "mb-2 last:mb-0",
  list: "mb-2 last:mb-0",
  listItem: "mb-1 flex gap-1",
  listText: "",
};

/** An Advogado IA answer, through the same Markdown parser as the minutas. */
export function ChatMarkdown({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  return (
    <div className="text-sm leading-relaxed whitespace-pre-line">
      <DocumentBlocks blocks={blocks} styles={CHAT_STYLES} />
    </div>
  );
}
