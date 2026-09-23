import type { DocumentBlock, HeadingLevel, ListItem, TextRun } from "@/lib/markdown/types";

const HEADING_CLASSES: Record<HeadingLevel, string> = {
  1: "mb-4 text-center text-xl font-bold uppercase",
  2: "mt-6 mb-2 text-base font-bold",
  3: "mt-4 mb-2 text-base font-semibold",
  4: "mt-3 mb-1 text-base font-semibold",
};
const HEADING_TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
const LIST_INDENT_REM = 1.5;

function Runs({ runs }: { runs: TextRun[] }) {
  return runs.map((textRun, index) => (
    <span
      key={index}
      className={`${textRun.bold ? "font-bold" : ""} ${textRun.italic ? "italic" : ""}`}
    >
      {textRun.text}
    </span>
  ));
}

function ListItemRow({ item }: { item: ListItem }) {
  return (
    <div className="mb-2 flex gap-2" style={{ paddingLeft: `${item.depth * LIST_INDENT_REM}rem` }}>
      <span className="w-6 shrink-0">{item.marker}</span>
      <span className="text-justify">
        <Runs runs={item.runs} />
      </span>
    </div>
  );
}

function Block({ block }: { block: DocumentBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = HEADING_TAGS[block.level];
      return (
        <Tag className={HEADING_CLASSES[block.level]}>
          <Runs runs={block.runs} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="mb-3 text-justify">
          <Runs runs={block.runs} />
        </p>
      );
    case "list":
      return (
        <div className="mb-3">
          {block.items.map((item, index) => (
            <ListItemRow key={index} item={item} />
          ))}
        </div>
      );
  }
}

/** Paper-like rendering of the same block model used for DOCX and PDF export. */
export function MinutaPreview({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <article className="whitespace-pre-line rounded-lg border border-zinc-200 bg-white px-8 py-10 font-serif text-[15px] leading-relaxed text-zinc-900 shadow-sm sm:px-12">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </article>
  );
}
