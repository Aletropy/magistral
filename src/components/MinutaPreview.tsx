import { DocumentBlocks, type BlockStyles } from "@/components/markdown/DocumentBlocks";
import type { DocumentBlock } from "@/lib/markdown/types";

const PAPER_STYLES: BlockStyles = {
  headings: {
    1: "mb-4 text-center text-xl font-bold uppercase",
    2: "mt-6 mb-2 text-base font-bold",
    3: "mt-4 mb-2 text-base font-semibold",
    4: "mt-3 mb-1 text-base font-semibold",
  },
  paragraph: "mb-3 text-justify",
  list: "mb-3",
  listItem: "mb-2 flex gap-2",
  listText: "text-justify",
};

/** Paper-like rendering of the same block model used for DOCX and PDF export. */
export function MinutaPreview({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <article className="whitespace-pre-line rounded-lg border border-zinc-200 bg-white px-8 py-10 font-serif text-[15px] leading-relaxed text-zinc-900 shadow-sm sm:px-12">
      <DocumentBlocks blocks={blocks} styles={PAPER_STYLES} />
    </article>
  );
}
