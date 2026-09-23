import { parseMarkdown, toPlainText } from "@/lib/markdown/parseMarkdown";

/** The document's first heading, which the output rules make the title; the fallback when there is none. */
export function titleFromMarkdown(markdown: string, fallback: string): string {
  const heading = parseMarkdown(markdown).find((block) => block.type === "heading");
  return (heading && toPlainText(heading.runs).trim()) || fallback;
}
