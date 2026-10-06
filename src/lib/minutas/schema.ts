import { z } from "zod";
import { MAX_EXPORT_MARKDOWN_CHARS } from "@/lib/export/schema";

/** A reviewed version of a saved minuta (e.g. after accepting or rejecting changes in the redline). */
export const minutaUpdateSchema = z.object({
  markdown: z
    .string()
    .trim()
    .min(1, { error: "A minuta não pode ficar vazia." })
    .max(MAX_EXPORT_MARKDOWN_CHARS, { error: "A minuta ficou grande demais para salvar." }),
});

export type MinutaUpdate = z.infer<typeof minutaUpdateSchema>;

/** What the history stores besides the Markdown, validated when a saved minuta is read back. */
export const storedResultSchema = z.object({
  forbiddenTermsFound: z.array(z.string()),
  consultedSources: z.array(z.object({ ref: z.string(), title: z.string(), label: z.string() })),
  retrievalStrategy: z.enum(["full", "search"]).nullable(),
  referenceCheck: z
    .object({ checked: z.number(), unconfirmed: z.array(z.object({ reference: z.string(), reason: z.string() })) })
    .nullable()
    .optional(),
  approvedClauseOrderKept: z.boolean(),
  approvedClauses: z.array(z.object({ title: z.string(), body: z.string() })),
});
