import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
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
