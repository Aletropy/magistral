import { describe, expect, it } from "vitest";
import { CHUNK_OVERLAP_CHARS, MAX_CHUNK_CHARS, chunkLegalText } from "./chunkLegalText";

const MUNICIPAL_LAW = `LEI COMPLEMENTAR Nº 7, DE 7 DE DEZEMBRO DE 1973

Institui e disciplina os tributos de competência do Município.

O PREFEITO MUNICIPAL, faço saber que a Câmara Municipal aprovou e eu sanciono a seguinte Lei Complementar:

TÍTULO I
DO IMPOSTO SOBRE A PROPRIEDADE PREDIAL E TERRITORIAL URBANA

CAPÍTULO I
DA INCIDÊNCIA

Art. 1º O Imposto sobre a Propriedade Predial e Territorial Urbana tem como fato gerador a propriedade, o domínio útil ou a posse de bem imóvel localizado na zona urbana do Município.
§ 1º Considera-se ocorrido o fato gerador em 1º de janeiro de cada exercício.
§ 2º O imposto é devido anualmente.

Art. 2º São contribuintes do imposto:
I – o proprietário do imóvel;
II – o titular do domínio útil;
III – o possuidor a qualquer título.
Parágrafo único. O cessionário de imóvel público responde pelo imposto.

CAPÍTULO II
DA BASE DE CÁLCULO

Art. 10. A base de cálculo do imposto é o valor venal do imóvel.

Art. 10-A. O valor venal será apurado conforme a Planta Genérica de Valores.

TÍTULO II
DO IMPOSTO SOBRE SERVIÇOS

Art. 11. O imposto tem como fato gerador a prestação de serviços constantes da lista anexa.`;

describe("chunkLegalText on legislation", () => {
  const chunks = chunkLegalText(MUNICIPAL_LAW);

  it("keeps each article with its paragraphs and incisos", () => {
    const article2 = chunks.find((chunk) => chunk.label === "Art. 2º")!;
    expect(article2.text).toContain("III – o possuidor a qualquer título.");
    expect(article2.text).toContain("Parágrafo único. O cessionário");

    const article1 = chunks.find((chunk) => chunk.label === "Art. 1º")!;
    expect(article1.text).toContain("§ 2º O imposto é devido anualmente.");
    expect(article1.text).not.toContain("Art. 2º");
  });

  it("labels articles the Brazilian way, including lettered ones", () => {
    expect(chunks.map((chunk) => chunk.label)).toEqual([
      "Preâmbulo",
      "Art. 1º",
      "Art. 2º",
      "Art. 10",
      "Art. 10-A",
      "Art. 11",
    ]);
  });

  it("records the heading path, joining a heading with its title line and resetting lower levels", () => {
    const byLabel = Object.fromEntries(chunks.map((chunk) => [chunk.label, chunk.context]));
    expect(byLabel["Art. 1º"]).toBe(
      "TÍTULO I – DO IMPOSTO SOBRE A PROPRIEDADE PREDIAL E TERRITORIAL URBANA › CAPÍTULO I – DA INCIDÊNCIA",
    );
    expect(byLabel["Art. 10"]).toContain("CAPÍTULO II – DA BASE DE CÁLCULO");
    expect(byLabel["Art. 11"]).toBe("TÍTULO II – DO IMPOSTO SOBRE SERVIÇOS");
  });

  it("keeps the text before the first article as a preamble", () => {
    expect(chunks[0].text).toContain("LEI COMPLEMENTAR Nº 7");
    expect(chunks[0].text).not.toContain("TÍTULO I");
  });

  it("splits an oversized article at its paragraphs and repeats the caput", () => {
    const paragraphs = Array.from(
      { length: 12 },
      (_, index) => `§ ${index + 1}º ${"Disposição detalhada sobre isenções e reduções. ".repeat(8)}`,
    );
    const law = `Art. 1º Ficam isentos do imposto os imóveis abaixo.\n${paragraphs.join("\n")}\n\nArt. 2º Vigência imediata.`;
    const split = chunkLegalText(law).filter((chunk) => chunk.label.startsWith("Art. 1º"));

    expect(split.length).toBeGreaterThan(1);
    expect(split[1].label).toBe("Art. 1º (parte 2)");
    for (const chunk of split) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      expect(chunk.text.startsWith("Art. 1º Ficam isentos")).toBe(true);
    }
    expect(split.map((chunk) => chunk.text).join("\n")).toContain("§ 12º");
  });
});

describe("chunkLegalText on prose", () => {
  const OPINION = [
    "PARECER Nº 12/2026",
    "I – RELATÓRIO",
    "Trata-se de consulta sobre a cobrança de ISS.",
    "II – FUNDAMENTAÇÃO",
    ...Array.from({ length: 10 }, (_, index) => `Parágrafo ${index + 1}. ${"Argumento jurídico extenso. ".repeat(12)}`),
    "É o parecer.",
  ].join("\n\n");

  const chunks = chunkLegalText(OPINION);

  it("packs paragraphs under the current section heading", () => {
    expect(chunks[0]).toMatchObject({ label: "Trecho 1", context: "I – RELATÓRIO" });
    expect(chunks[1].context).toBe("II – FUNDAMENTAÇÃO");
    expect(chunks.every((chunk) => chunk.text.length <= MAX_CHUNK_CHARS)).toBe(true);
  });

  it("overlaps consecutive chunks within a section", () => {
    const [, second, third] = chunks;
    const overlap = second.text.slice(-CHUNK_OVERLAP_CHARS / 2);
    expect(third.text).toContain(overlap);
  });

  it("does not treat a single stray article reference as legislation", () => {
    expect(chunkLegalText("Art. 5º da Constituição garante o direito.\n\nConclui-se pela legalidade.")[0].label).toBe(
      "Trecho 1",
    );
  });
});
