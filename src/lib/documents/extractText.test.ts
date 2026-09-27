import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { renderDocument } from "@/lib/export/renderDocument";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import { DocumentExtractionError } from "./errors";
import { extractText } from "./extractText";
import { MAX_DOCX_UNCOMPRESSED_BYTES } from "./checkZipSize";
import { MAX_UPLOAD_BYTES } from "./formats";

const SAMPLE = `# CONTRATO DE LOCAÇÃO

## CLÁUSULA PRIMEIRA – DO OBJETO

O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado na Rua das Flores, 100, para fins exclusivamente residenciais.

## CLÁUSULA SEGUNDA – DO PRAZO

O prazo da locação é de 30 (trinta) meses.`;

async function fixture(format: "pdf" | "docx"): Promise<Uint8Array> {
  return renderDocument(parseMarkdown(SAMPLE), format);
}

describe("extractText", () => {
  it.each(["pdf", "docx"] as const)("reads the text of a %s", async (format) => {
    const text = await extractText({ name: `modelo.${format.toUpperCase()}`, bytes: await fixture(format) });

    expect(text).toContain("CLÁUSULA PRIMEIRA – DO OBJETO");
    expect(text).toContain("O prazo da locação é de 30 (trinta) meses.");
  });

  it("rejects a DOCX that would inflate past the limit without inflating it", async () => {
    const bomb = zipSync({ "word/document.xml": new Uint8Array(MAX_DOCX_UNCOMPRESSED_BYTES + 1) }, { level: 9 });
    expect(bomb.byteLength).toBeLessThan(MAX_UPLOAD_BYTES);
    await expect(extractText({ name: "bomba.docx", bytes: bomb })).rejects.toMatchObject({ reason: "too_large" });
  });

  it("rejects unsupported extensions, oversized files and unreadable content", async () => {
    await expect(extractText({ name: "notas.txt", bytes: new Uint8Array(1) })).rejects.toMatchObject({
      reason: "unsupported_type",
    });
    await expect(
      extractText({ name: "grande.pdf", bytes: new Uint8Array(MAX_UPLOAD_BYTES + 1) }),
    ).rejects.toMatchObject({ reason: "too_large" });
    await expect(extractText({ name: "quebrado.docx", bytes: new Uint8Array([1, 2, 3]) })).rejects.toBeInstanceOf(
      DocumentExtractionError,
    );
  });

  it("rejects documents with almost no text", async () => {
    const bytes = await renderDocument(parseMarkdown("# OI"), "docx");
    await expect(extractText({ name: "vazio.docx", bytes })).rejects.toMatchObject({ reason: "no_text" });
  });
});
