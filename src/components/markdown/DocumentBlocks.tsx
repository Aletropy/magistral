import type { DocumentBlock, HeadingLevel, ListItem, TextRun } from "@/lib/markdown/types";

/** How one surface styles the shared block model (the paper preview, a chat answer). */
export interface BlockStyles {
  headings: Record<HeadingLevel, string>;
  paragraph: string;
  list: string;
  listItem: string;
  listText: string;
}

const HEADING_TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
const LIST_INDENT_REM = 1.5;

function Runs({ runs }: { runs: TextRun[] }) {
  return runs.map((textRun, index) => (
    <span key={index} className={`${textRun.bold ? "font-bold" : ""} ${textRun.italic ? "italic" : ""}`}>
      {textRun.text}
    </span>
  ));
}

function ListItemRow({ item, styles }: { item: ListItem; styles: BlockStyles }) {
  return (
    <div className={styles.listItem} style={{ paddingLeft: `${item.depth * LIST_INDENT_REM}rem` }}>
      <span className="w-6 shrink-0">{item.marker}</span>
      <span className={styles.listText}>
        <Runs runs={item.runs} />
      </span>
    </div>
  );
}

function Block({ block, styles }: { block: DocumentBlock; styles: BlockStyles }) {
  switch (block.type) {
    case "heading": {
      const Tag = HEADING_TAGS[block.level];
      return (
        <Tag className={styles.headings[block.level]}>
          <Runs runs={block.runs} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className={styles.paragraph}>
          <Runs runs={block.runs} />
        </p>
      );
    case "list":
      return (
        <div className={styles.list}>
          {block.items.map((item, index) => (
            <ListItemRow key={index} item={item} styles={styles} />
          ))}
        </div>
      );
  }
}

/** Renders the block model that also feeds the DOCX and PDF exports. */
export function DocumentBlocks({ blocks, styles }: { blocks: DocumentBlock[]; styles: BlockStyles }) {
  return blocks.map((block, index) => <Block key={index} block={block} styles={styles} />);
}
