import { z } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";
import { minutaPath } from "@/lib/minutas/paths";
import type { MinutaRepository } from "@/lib/minutas/repository";
import { plural } from "@/lib/text/plural";
import { fingerprint } from "../fingerprint";
import { defineActionTool } from "../tool";

export const MAX_MINUTA_EDITS = 20;
const MAX_ID_CHARS = 64;
const MAX_EDIT_CHARS = 8000;
const MAX_EDIT_SUMMARY_CHARS = 200;
const CHANGED_MESSAGE = "A minuta mudou depois que a alteração foi proposta. Peça a alteração de novo.";

const editSchema = z.object({
  trecho: z.string().min(1).max(MAX_EDIT_CHARS).describe("O texto atual, copiado exatamente da minuta (ler_minuta)."),
  novoTexto: z.string().max(MAX_EDIT_CHARS).describe("O texto que o substitui; vazio para remover o trecho."),
});

const editInputSchema = z.object({
  id: z.string().trim().min(1).max(MAX_ID_CHARS),
  resumo: z.string().trim().min(1).max(MAX_EDIT_SUMMARY_CHARS).describe("O que muda, em uma frase (ex.: “Reduz a multa para 10%”)."),
  alteracoes: z.array(editSchema).min(1).max(MAX_MINUTA_EDITS),
});
type EditInput = z.infer<typeof editInputSchema>;

const editStateSchema = z.object({ fingerprint: z.string() });

function occurrences(text: string, excerpt: string): number {
  let count = 0;
  for (let at = text.indexOf(excerpt); at !== -1; at = text.indexOf(excerpt, at + excerpt.length)) count++;
  return count;
}

/** Applies each replacement; every excerpt must appear exactly once, so the change lands where intended. */
export function applyEdits(markdown: string, edits: EditInput["alteracoes"]): string {
  return edits.reduce((text, edit, index) => {
    const found = occurrences(text, edit.trecho);
    if (found !== 1) {
      const problem = found === 0 ? "não foi encontrado exatamente" : "aparece mais de uma vez; inclua mais texto ao redor";
      throw new AppError(HTTP_UNPROCESSABLE_CONTENT, `O trecho da alteração ${index + 1} ${problem}. Copie-o da minuta com ler_minuta.`);
    }
    return text.replace(edit.trecho, () => edit.novoTexto);
  }, markdown);
}

/** Proposes changes to a saved minuta; the user sees them marked up and confirms before they are saved. */
export function createEditMinutaTool({ minutas }: { minutas: MinutaRepository }) {
  function load(id: string, ownerId: string) {
    const minuta = minutas.get(id, ownerId);
    if (!minuta) throw new AppError(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
    return minuta;
  }

  return defineActionTool({
    name: "editar_minuta",
    description:
      "Propõe alterações no texto de uma minuta do histórico: cada uma troca um trecho copiado exatamente da minuta por um novo texto. O usuário vê as mudanças marcadas e confirma antes de salvar. Leia a minuta com ler_minuta antes.",
    input: editInputSchema,
    progressLabel: "Preparando as alterações",
    async propose({ id, resumo, alteracoes }, { ownerId }) {
      const minuta = load(id, ownerId);
      const original = minuta.result.markdown;
      return {
        summary: `${resumo} (${plural(alteracoes.length, "alteração", "alterações")} em “${minuta.title}”)`,
        card: { type: "redline", title: minuta.title, original, revised: applyEdits(original, alteracoes) },
        state: { fingerprint: fingerprint(original) },
      };
    },
    async execute({ id, alteracoes }, state, { ownerId }) {
      const minuta = load(id, ownerId);
      if (editStateSchema.parse(state).fingerprint !== fingerprint(minuta.result.markdown)) throw new AppError(HTTP_CONFLICT, CHANGED_MESSAGE);
      minutas.updateMarkdown(id, ownerId, applyEdits(minuta.result.markdown, alteracoes));
      return {
        output: "As alterações foram salvas na minuta.",
        summary: `Alterações salvas em “${minuta.title}”`,
        card: { type: "link", href: minutaPath(id), label: "Abrir a minuta" },
      };
    },
  });
}
