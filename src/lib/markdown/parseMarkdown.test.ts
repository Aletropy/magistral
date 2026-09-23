import { describe, expect, it } from "vitest";
import { parseMarkdown, toPlainText } from "./parseMarkdown";

describe("parseMarkdown", () => {
  it("parses headings and clamps deep levels", () => {
    const blocks = parseMarkdown("# Título\n\n## Cláusula\n\n###### Nota");
    expect(blocks).toEqual([
      { type: "heading", level: 1, runs: [{ text: "Título", bold: false, italic: false }] },
      { type: "heading", level: 2, runs: [{ text: "Cláusula", bold: false, italic: false }] },
      { type: "heading", level: 4, runs: [{ text: "Nota", bold: false, italic: false }] },
    ]);
  });

  it("keeps bold and italic runs and merges adjacent plain text", () => {
    const [block] = parseMarkdown("A **CONTRATADA** deve *sempre* cumprir \\*prazos\\*.");
    expect(block).toEqual({
      type: "paragraph",
      runs: [
        { text: "A ", bold: false, italic: false },
        { text: "CONTRATADA", bold: true, italic: false },
        { text: " deve ", bold: false, italic: false },
        { text: "sempre", bold: false, italic: true },
        { text: " cumprir *prazos*.", bold: false, italic: false },
      ],
    });
  });

  it("keeps line breaks and decodes HTML entities", () => {
    const [block] = parseMarkdown("Local, data\nCONTRATANTE &amp; Cia");
    expect(block.type === "paragraph" && toPlainText(block.runs)).toBe("Local, data\nCONTRATANTE & Cia");
  });

  it("keeps underscore signature lines that Markdown reads as rules", () => {
    const blocks = parseMarkdown("______________\nCONTRATANTE");
    expect(blocks.map((block) => block.type === "paragraph" && toPlainText(block.runs))).toEqual([
      "______________",
      "CONTRATANTE",
    ]);
  });

  it("keeps signature lines inside list items", () => {
    const [list] = parseMarkdown("1.  ______________\n    Nome:\n    CPF:");
    expect(list.type === "list" && toPlainText(list.items[0].runs)).toBe("______________\nNome:\nCPF:");
  });

  it("numbers ordered lists from their start and letters nested ordered items", () => {
    const [list] = parseMarkdown("3. três\n   1. sub\n   2. sub2\n4. quatro");
    expect(list.type === "list" && list.items.map(({ marker, depth }) => [marker, depth])).toEqual([
      ["3.", 0],
      ["a)", 1],
      ["b)", 1],
      ["4.", 0],
    ]);
  });

  it("uses bullets for unordered lists", () => {
    const [list] = parseMarkdown("- um\n  - dois");
    expect(list.type === "list" && list.items.map((item) => item.marker)).toEqual(["•", "–"]);
  });

  it("drops blank space and horizontal rules", () => {
    expect(parseMarkdown("Texto\n\n---\n\n\nMais")).toHaveLength(2);
  });
});
