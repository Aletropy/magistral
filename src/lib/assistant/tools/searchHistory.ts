import { z } from "zod";
import type { MinutaRepository } from "@/lib/minutas/repository";
import { plural } from "@/lib/text/plural";
import { defineReadTool } from "../tool";

export const HISTORY_RESULTS = 10;
const MAX_HISTORY_QUERY_CHARS = 200;
const DATE_CHARS = 10;

export function createSearchHistoryTool({ minutas }: { minutas: MinutaRepository }) {
  return defineReadTool({
    name: "buscar_historico",
    description:
      "Procura as minutas que o usuário já gerou (título, tipo de documento ou persona), das mais recentes para as mais antigas. Sem consulta, lista as últimas. Devolve o id para ler_minuta.",
    input: z.object({
      consulta: z.string().trim().max(MAX_HISTORY_QUERY_CHARS).default("").describe("Parte do título, do tipo ou da persona; vazio para as mais recentes."),
    }),
    progressLabel: "Procurando no histórico",
    async run({ consulta }, { ownerId }) {
      const page = minutas.search(ownerId, { query: consulta, personaName: "", limit: HISTORY_RESULTS, offset: 0 });
      const lines = page.items.map(
        (minuta) =>
          `- id ${minuta.id}: ${minuta.title} (${minuta.documentTypeLabel}, persona ${minuta.personaName}, ${minuta.updatedAt.slice(0, DATE_CHARS)})`,
      );
      const more = page.total > page.items.length ? `\n(${page.total - page.items.length} outras não listadas; refine a busca.)` : "";
      const what = consulta ? `“${consulta}” no histórico` : "as últimas minutas";
      return {
        output: lines.length > 0 ? `${lines.join("\n")}${more}` : "Nenhuma minuta encontrada.",
        summary: `Procurei ${what} (${plural(page.total, "minuta", "minutas")})`,
      };
    },
  });
}
