import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import { DEFAULT_FILE_BASENAME, buildFileName } from "./formats";

describe("buildFileName", () => {
  it("slugifies the first heading without diacritics", () => {
    const blocks = parseMarkdown("# Contrato de Locação — Imóvel\n\nTexto");
    expect(buildFileName(blocks, "pdf")).toBe("contrato-de-locacao-imovel.pdf");
  });

  it("falls back to the default name when there is no heading", () => {
    expect(buildFileName(parseMarkdown("Só texto."), "docx")).toBe(`${DEFAULT_FILE_BASENAME}.docx`);
  });
});
