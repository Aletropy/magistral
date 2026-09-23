import { vi } from "vitest";
import { renderDocument } from "@/lib/export/renderDocument";
import { EMBEDDING_DIMENSIONS } from "@/lib/llm/gemini/config";
import type { Embedder } from "@/lib/llm/gemini/embed";
import { NO_USAGE } from "@/lib/llm/types";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

/** A unit vector along one axis, so nearest-neighbour results in tests are predictable. */
export function axisVector(axis: number): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === axis ? 1 : 0));
}

/** Embeds anything mentioning "hospedagem" on axis 1 and everything else on axis 0. */
export function fakeEmbedder() {
  return vi.fn<Embedder>(async (texts) => ({
    embeddings: texts.map((text) => axisVector(text.toLowerCase().includes("hospedagem") ? 1 : 0)),
    model: "fake-embedding",
    usage: NO_USAGE,
  }));
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
