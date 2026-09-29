import { z } from "zod";
import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { formatSource } from "@/lib/prompt/buildUserPrompt";
import { blockGroup } from "@/lib/prompt/taggedBlock";
import { hybridSearch } from "@/lib/rag/hybridSearch";
import type { LibraryRepository } from "@/lib/rag/repository";
import { plural } from "@/lib/text/plural";
import { defineReadTool } from "../tool";

export const MAX_LIBRARY_QUERY_CHARS = 500;
/** The excerpts found carry the whole answer, so they may take more room than other results. */
const LIBRARY_RESULT_MAX_CHARS = 30_000;
const EMPTY_LIBRARY_OUTPUT = "A biblioteca jurídica está vazia. Diga ao usuário que ele pode adicionar documentos em Biblioteca.";
const NOTHING_FOUND_OUTPUT = "Nenhum trecho da biblioteca corresponde à busca. Tente outros termos ou diga que a biblioteca não trata do assunto.";

export interface SearchLibraryDeps {
  library: LibraryRepository;
  /** Created on first use, so a conversation that never searches never loads the model. */
  embedder: () => EmbeddingModel;
}

export function createSearchLibraryTool({ library, embedder }: SearchLibraryDeps) {
  return defineReadTool({
    name: "buscar_biblioteca",
    description:
      "Busca trechos na biblioteca jurídica do usuário (leis, decretos, normas internas). Use antes de afirmar o que uma norma da biblioteca diz. Cada trecho vem com um identificador [F1], [F2]… para citar logo após a afirmação.",
    input: z.object({
      consulta: z.string().trim().min(1).max(MAX_LIBRARY_QUERY_CHARS).describe("O que procurar, em palavras do assunto (ex.: “garantias locatícias fiança”)."),
    }),
    progressLabel: "Buscando na biblioteca",
    async run({ consulta }, { signal, citations }) {
      if (library.totalChars() === 0) return { output: EMPTY_LIBRARY_OUTPUT, summary: `Busquei “${consulta}”: a biblioteca está vazia` };
      const chunks = await hybridSearch(library, embedder(), consulta, { signal });
      const sources = citations.add(
        chunks.map((chunk) => ({ title: chunk.sourceTitle, label: chunk.label, context: chunk.context, text: chunk.text })),
      );
      if (sources.length === 0) return { output: NOTHING_FOUND_OUTPUT, summary: `Busquei “${consulta}” na biblioteca: nada encontrado` };
      return {
        output: blockGroup("fontes", sources.map(formatSource)),
        summary: `Busquei “${consulta}” na biblioteca (${plural(sources.length, "trecho", "trechos")})`,
        maxOutputChars: LIBRARY_RESULT_MAX_CHARS,
      };
    },
  });
}
