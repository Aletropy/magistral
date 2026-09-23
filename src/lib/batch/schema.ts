import { z } from "zod";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { MAX_BATCH_COLUMNS, MAX_BATCH_ROWS, MAX_CELL_CHARS } from "./spreadsheet";

export const MAX_BATCH_NAME_CHARS = 120;

const rowSchema = z
  .record(z.string().max(MAX_CELL_CHARS), z.string().max(MAX_CELL_CHARS))
  .refine((row) => Object.keys(row).length <= MAX_BATCH_COLUMNS, { error: `Use no máximo ${MAX_BATCH_COLUMNS} colunas.` });

export const batchRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Dê um nome ao lote." })
    .max(MAX_BATCH_NAME_CHARS, { error: `Use no máximo ${MAX_BATCH_NAME_CHARS} caracteres.` }),
  /** A regular minuta request whose text fields may contain {{coluna}} placeholders. */
  template: minutaRequestSchema,
  rows: z
    .array(rowSchema)
    .min(1, { error: "A planilha não tem linhas de dados." })
    .max(MAX_BATCH_ROWS, { error: `Use no máximo ${MAX_BATCH_ROWS} linhas por lote.` }),
});

export type BatchRequest = z.infer<typeof batchRequestSchema>;
