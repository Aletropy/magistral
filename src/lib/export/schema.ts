import { z } from "zod";
import { EXPORT_FORMATS } from "./formats";

export const MAX_EXPORT_MARKDOWN_CHARS = 300_000;

export const exportRequestSchema = z.object({
  markdown: z
    .string()
    .trim()
    .min(1, { error: "Não há conteúdo para exportar." })
    .max(MAX_EXPORT_MARKDOWN_CHARS, { error: "O documento é grande demais para exportar." }),
  format: z.enum(EXPORT_FORMATS, { error: "Formato de exportação inválido." }),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;
