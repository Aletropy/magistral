import { vi } from "vitest";
import { renderDocument } from "@/lib/export/renderDocument";
import type { EmbedFunction, EmbeddingModel } from "@/lib/llm/embeddings";
import { NO_USAGE } from "@/lib/llm/types";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

export const TEST_DIMENSIONS = 768;
export const FAKE_EMBEDDING_ID = "fake-embedding";

/** A unit vector along one axis, so nearest-neighbour results in tests are predictable. */
export function axisVector(axis: number, dimensions: number = TEST_DIMENSIONS): number[] {
  return Array.from({ length: dimensions }, (_, index) => (index === axis ? 1 : 0));
}

/** Embeds anything mentioning "hospedagem" on axis 1 and everything else on axis 0. */
export function fakeEmbedder(id: string = FAKE_EMBEDDING_ID, dimensions: number = TEST_DIMENSIONS) {
  const embed = vi.fn<EmbedFunction>(async (texts) => ({
    embeddings: texts.map((text) => axisVector(text.toLowerCase().includes("hospedagem") ? 1 : 0, dimensions)),
    model: id,
    usage: NO_USAGE,
  }));
  return { id, dimensions, embed } satisfies EmbeddingModel;
}

/** Renders a DOCX fixture; separate lines with blank lines, since Markdown joins adjacent ones. */
export function docxFromMarkdown(markdown: string): Promise<Uint8Array> {
  return renderDocument(parseMarkdown(markdown), "docx");
}

export const IPTU_LAW = `LEI COMPLEMENTAR Nº 7/1973

TÍTULO I

DO IMPOSTO PREDIAL

Art. 1º O imposto sobre a propriedade predial e territorial urbana incide sobre imóveis urbanos do Município.

Art. 2º Contribuinte é o proprietário, o titular do domínio útil ou o possuidor a qualquer título.`;

export const ISS_LAW = `LEI COMPLEMENTAR Nº 306/1993

TÍTULO I

DO IMPOSTO SOBRE SERVIÇOS

Art. 1º O imposto sobre serviços incide sobre a hospedagem em hotéis, pousadas e similares.

Art. 2º O imposto é devido no local do imóvel onde se presta o serviço de hospedagem.`;
