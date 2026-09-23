import { describe, expect, it } from "vitest";
import { applyHunkDecisions, diffWords } from "./wordDiff";

const ORIGINAL = "O locatário pagará multa de 2% em caso de atraso.";
const REVISED = "O locatário pagará multa de 10% e juros em caso de atraso.";

describe("diffWords", () => {
  it("groups a replaced word and an inserted phrase into one reviewable change", () => {
    expect(diffWords(ORIGINAL, REVISED)).toEqual([
      { type: "equal", text: "O locatário pagará multa de " },
      { type: "change", id: 0, deleted: "2%", inserted: "10% e juros" },
      { type: "equal", text: " em caso de atraso." },
    ]);
  });

  it("works on whole words, never splitting one", () => {
    expect(diffWords("A rescisão será imediata.", "A rescindir será imediata.")).toEqual([
      { type: "equal", text: "A " },
      { type: "change", id: 0, deleted: "rescisão", inserted: "rescindir" },
      { type: "equal", text: " será imediata." },
    ]);
  });

  it("reports identical texts as a single equal part", () => {
    expect(diffWords(ORIGINAL, ORIGINAL)).toEqual([{ type: "equal", text: ORIGINAL }]);
  });
});

describe("applyHunkDecisions", () => {
  const parts = diffWords(
    "## Multa\n\nMulta de 2%.\n\n## Foro\n\nForo de Porto Alegre.",
    "## Multa\n\nMulta de 10%.\n\n## Foro\n\nForo de Canoas.",
  );

  it("rebuilds the revision when everything is accepted and the original when everything is rejected", () => {
    const changes = parts.filter((part) => part.type === "change");
    expect(applyHunkDecisions(parts, new Map())).toContain("Foro de Canoas.");
    expect(applyHunkDecisions(parts, new Map(), "reject")).toBe("## Multa\n\nMulta de 2%.\n\n## Foro\n\nForo de Porto Alegre.");
    expect(changes.length).toBeGreaterThanOrEqual(2);
  });

  it("mixes per-change decisions", () => {
    const [first] = parts.filter((part) => part.type === "change");
    const text = applyHunkDecisions(parts, new Map([[first.id, "reject"]]));
    expect(text).toContain("Multa de 2%.");
    expect(text).toContain("Foro de Canoas.");
  });
});
