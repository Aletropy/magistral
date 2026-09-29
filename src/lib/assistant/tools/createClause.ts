import { z } from "zod";
import { clauseEditPath } from "@/lib/clauses/paths";
import type { ClauseRepository } from "@/lib/clauses/repository";
import { clauseInputSchema, type ClauseInput } from "@/lib/clauses/schema";
import { AppError } from "@/lib/errors/AppError";
import { HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";
import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS } from "@/lib/minuta/documentTypes";
import { defineActionTool } from "../tool";

const clauseToolInputSchema = z.object({
  titulo: z.string(),
  categoria: z.string().default("").describe("Ex.: Rescisão, Multa, Foro."),
  tiposDocumento: z.array(z.enum(DOCUMENT_TYPE_IDS)).default([]).describe("Tipos em que a cláusula é oferecida; vazio para todos."),
  texto: z.string().describe("O texto aprovado da cláusula, em Markdown."),
});
type ClauseToolInput = z.infer<typeof clauseToolInputSchema>;

function toClauseInput(input: ClauseToolInput): ClauseInput {
  const result = clauseInputSchema.safeParse({
    title: input.titulo,
    category: input.categoria,
    documentTypes: input.tiposDocumento,
    body: input.texto,
  });
  if (!result.success) throw new AppError(HTTP_UNPROCESSABLE_CONTENT, result.error.issues[0].message);
  return result.data;
}

/** Adds an approved clause to the office's shared library, after the user confirms its wording. */
export function createCreateClauseTool({ clauses }: { clauses: ClauseRepository }) {
  return defineActionTool({
    name: "criar_clausula",
    description:
      "Cadastra uma nova cláusula aprovada na biblioteca de cláusulas do escritório (compartilhada com a equipe). O usuário confirma o texto antes.",
    input: clauseToolInputSchema,
    progressLabel: "Preparando a cláusula",
    async propose(input) {
      const clause = toClauseInput(input);
      const types = clause.documentTypes.map((id) => DOCUMENT_TYPE_LABELS[id]).join(", ") || "Todos os tipos";
      return {
        summary: `Criar a cláusula “${clause.title}”`,
        card: {
          type: "fields",
          title: clause.title,
          rows: [
            { label: "Categoria", value: clause.category || "—" },
            { label: "Vale para", value: types },
            { label: "Texto", value: clause.body },
          ],
        },
      };
    },
    async execute(input) {
      const clause = clauses.create(toClauseInput(input));
      return {
        output: `A cláusula “${clause.title}” foi criada (id ${clause.id}).`,
        summary: `Cláusula “${clause.title}” criada`,
        card: { type: "link", href: clauseEditPath(clause.id), label: "Abrir a cláusula" },
      };
    },
  });
}
