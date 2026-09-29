import { z } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_NOT_FOUND } from "@/lib/http/status";
import { MINUTA_NOT_FOUND_MESSAGE } from "@/lib/minutas/messages";
import { minutaPath } from "@/lib/minutas/paths";
import type { MinutaRepository } from "@/lib/minutas/repository";
import { defineReadTool } from "../tool";

/** A whole contract fits; a very long one is cut rather than crowding out the conversation. */
export const MINUTA_RESULT_MAX_CHARS = 60_000;
const MAX_ID_CHARS = 64;

export function createReadMinutaTool({ minutas }: { minutas: MinutaRepository }) {
  return defineReadTool({
    name: "ler_minuta",
    description: "Lê o texto completo de uma minuta do histórico do usuário, pelo id (de buscar_historico ou do contexto).",
    input: z.object({ id: z.string().trim().min(1).max(MAX_ID_CHARS) }),
    progressLabel: "Lendo a minuta",
    async run({ id }, { ownerId }) {
      const minuta = minutas.get(id, ownerId);
      if (!minuta) throw new AppError(HTTP_NOT_FOUND, MINUTA_NOT_FOUND_MESSAGE);
      return {
        output: `Título: ${minuta.title}\nTipo: ${minuta.documentTypeLabel}\nPersona: ${minuta.personaName}\nAtualizada em: ${minuta.updatedAt}\n\n${minuta.result.markdown}`,
        summary: `Li a minuta “${minuta.title}”`,
        card: { type: "link", href: minutaPath(minuta.id), label: "Abrir a minuta" },
        maxOutputChars: MINUTA_RESULT_MAX_CHARS,
      };
    },
  });
}
