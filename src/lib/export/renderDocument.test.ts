import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import { extractText } from "@/lib/documents/extractText";
import { splitByFont } from "./pdfFonts";
import { renderDocument } from "./renderDocument";

const SAMPLE_MARKDOWN = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS

## CLÁUSULA PRIMEIRA – DO OBJETO

A **CONTRATADA** prestará serviços de *consultoria* à CONTRATANTE, no valor de R$ 1.000,00.

1. Entrega mensal de relatórios;
   - com indicadores;
2. Reuniões quinzenais.

São Paulo, [PREENCHER: data].

______________________
CONTRATANTE
`;

const ZIP_SIGNATURE = "PK";
const PDF_SIGNATURE = "%PDF";

function signatureOf(file: Uint8Array, length: number): string {
  return Buffer.from(file.subarray(0, length)).toString("latin1");
}

describe("renderDocument", () => {
  const blocks = parseMarkdown(SAMPLE_MARKDOWN);

  it("renders a DOCX (zip) file", async () => {
    const file = await renderDocument(blocks, "docx");
    expect(file.byteLength).toBeGreaterThan(0);
    expect(signatureOf(file, ZIP_SIGNATURE.length)).toBe(ZIP_SIGNATURE);
  });

  it("renders a PDF file", async () => {
    const file = await renderDocument(blocks, "pdf");
    expect(file.byteLength).toBeGreaterThan(0);
    expect(signatureOf(file, PDF_SIGNATURE.length)).toBe(PDF_SIGNATURE);
  });
});

describe("PDF characters outside Windows-1252", () => {
  it("draws them with the fallback font so they survive, and keeps Times for the rest", async () => {
    const sample = "# TÍTULO\n\nMulta ≥ 2% → prazo ✓ Ω ≤ ≠, “aspas” § 2º — € e texto suficiente para passar do mínimo de caracteres.";
    const file = await renderDocument(parseMarkdown(sample), "pdf");
    const text = await extractText({ name: "minuta.pdf", bytes: file });

    for (const character of ["≥", "→", "✓", "Ω", "≤", "≠", "“", "§", "º", "—", "€"]) expect(text).toContain(character);
  });

  it("splits text into runs by the font that can draw them", () => {
    expect(splitByFont("a ≥ b “c”")).toEqual([
      { text: "a ", fallback: false },
      { text: "≥", fallback: true },
      { text: " b “c”", fallback: false },
    ]);
  });
});
