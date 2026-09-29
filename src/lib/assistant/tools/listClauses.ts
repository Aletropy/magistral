import { z } from "zod";
import type { ClauseRepository } from "@/lib/clauses/repository";
import { clauseAppliesTo } from "@/lib/clauses/types";
import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS } from "@/lib/minuta/documentTypes";
import { plural } from "@/lib/text/plural";
import { defineReadTool } from "../tool";

/** Enough of each clause for the model to tell them apart; the full text goes into the minuta itself. */
const CLAUSE_EXCERPT_CHARS = 240;

export function createListClausesTool({ clauses }: { clauses: ClauseRepository }) {
  return defineReadTool({
    name: "listar_clausulas",
    description:
      "Lista as cláusulas aprovadas do escritório com o id, a categoria e o começo do texto. Informe o tipo de documento para ver só as que valem para ele.",
    input: z.object({
      tipoDocumento: z.enum(DOCUMENT_TYPE_IDS).optional().describe("Só as cláusulas oferecidas para este tipo."),
    }),
    progressLabel: "Consultando as cláusulas aprovadas",
    async run({ tipoDocumento }) {
      const found = clauses.list().filter((clause) => !tipoDocumento || clauseAppliesTo(clause, tipoDocumento));
      const lines = found.map((clause) => {
        const types = clause.documentTypes.length > 0 ? clause.documentTypes.map((id) => DOCUMENT_TYPE_LABELS[id]).join(", ") : "todos os tipos";
        const excerpt = clause.body.replace(/\s+/g, " ").slice(0, CLAUSE_EXCERPT_CHARS);
        return `- id ${clause.id}: ${clause.title}${clause.category ? ` [${clause.category}]` : ""} (${types}): ${excerpt}…`;
      });
      const scope = tipoDocumento ? ` para ${DOCUMENT_TYPE_LABELS[tipoDocumento]}` : "";
      return {
        output: lines.length > 0 ? lines.join("\n") : `Nenhuma cláusula aprovada${scope}.`,
        summary: `Consultei as cláusulas aprovadas${scope} (${plural(found.length, "encontrada", "encontradas")})`,
      };
    },
  });
}
