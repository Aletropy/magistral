import { describe, expect, it, vi } from "vitest";
import { NO_USAGE, type StructuredGenerator } from "@/lib/llm/types";
import type { ContextSource } from "@/lib/rag/selectContext";
import {
  auditMinutaReferences,
  extractNormReferences,
  matchReferenceInSources,
  REFERENCE_PATTERNS,
} from "./auditReferences";

const SOURCE: ContextSource = {
  ref: "F1",
  title: "Lei Complementar nº 7/1973",
  label: "Art. 5º",
  context: "",
  text: "Art. 5º O imposto incide sobre a propriedade. Parágrafo único. A alíquota é de 2%.",
};

function stubGenerator(verdicts: unknown): StructuredGenerator {
  return vi.fn(async () => ({ text: JSON.stringify(verdicts), model: "teste", usage: NO_USAGE }));
}

describe("extractNormReferences", () => {
  it("finds articles and norms once each, in order", () => {
    const refs = extractNormReferences(
      "Conforme o art. 5º da Lei Complementar nº 7/1973, o imposto incide. O art. 5º vale. Veja o Decreto nº 10/2020.",
    );
    expect(refs.map(({ reference }) => reference)).toEqual([
      "art. 5º",
      "Lei Complementar nº 7/1973",
      "Decreto nº 10/2020",
    ]);
    expect(refs[0].sentence).toContain("o imposto incide");
  });

  it("ignores prose without citations", () => {
    expect(extractNormReferences("As partes assinam em duas vias.")).toEqual([]);
  });
});

describe("matchReferenceInSources", () => {
  it("matches article numbers and norm numbers in the sources", () => {
    const article = new RegExp(REFERENCE_PATTERNS.ARTICLE.source, "gi").exec("art. 5º")!;
    expect(matchReferenceInSources(article, true, [SOURCE])).toMatchObject({ ref: "F1" });
    const norm = new RegExp(REFERENCE_PATTERNS.NORM.source, "gi").exec("Lei nº 7/1973")!;
    expect(matchReferenceInSources(norm, false, [SOURCE])).toMatchObject({ ref: "F1" });
    const missing = new RegExp(REFERENCE_PATTERNS.ARTICLE.source, "gi").exec("art. 99")!;
    expect(matchReferenceInSources(missing, true, [SOURCE])).toBeNull();
  });
});

describe("auditMinutaReferences", () => {
  it("keeps confirmed references and flags the rest", async () => {
    const markdown = "O imposto incide (art. 5º). A multa segue a Lei nº 99/2000.";
    const generate = stubGenerator({
      verdicts: [
        { reference: "art. 5º", status: "confirmada", motivo: "Texto igual ao da fonte." },
        { reference: "Lei nº 99/2000", status: "nao_confirmada", motivo: "Número inexistente nas fontes." },
      ],
    });
    const audit = await auditMinutaReferences(markdown, [SOURCE], generate);
    expect(audit.checked).toBe(2);
    expect(audit.unconfirmed).toEqual([{ reference: "Lei nº 99/2000", reason: "Número inexistente nas fontes." }]);
    expect(generate).toHaveBeenCalledOnce();
  });

  it("marks references the judge leaves out as unconfirmed", async () => {
    const audit = await auditMinutaReferences("Conforme o art. 5º.", [SOURCE], stubGenerator({ verdicts: [] }));
    expect(audit.unconfirmed).toEqual([{ reference: "art. 5º", reason: "Verificação inconclusiva." }]);
  });
});
