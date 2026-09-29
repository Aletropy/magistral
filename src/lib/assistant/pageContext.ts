import { z } from "zod";

/**
 * What the user is looking at when they ask the assistant from the panel: a saved minuta, a persona, a
 * clause, a batch, the minuta wizard, or any other page by its title. Client-safe; the server resolves it
 * (with owner checks) into a short note for the prompt.
 */
export const PAGE_CONTEXT_KINDS = ["minuta", "persona", "clausula", "lote", "nova_minuta", "pagina"] as const;
export type PageContextKind = (typeof PAGE_CONTEXT_KINDS)[number];

const MAX_CONTEXT_ID_CHARS = 64;
export const MAX_CONTEXT_DETAIL_CHARS = 300;

export const pageContextSchema = z.object({
  kind: z.enum(PAGE_CONTEXT_KINDS),
  id: z.string().trim().max(MAX_CONTEXT_ID_CHARS).nullable().default(null),
  /** A few words the page adds, e.g. the wizard step, or the page title for kind "pagina". */
  detail: z.string().trim().max(MAX_CONTEXT_DETAIL_CHARS).default(""),
});
export type PageContext = z.infer<typeof pageContextSchema>;
export type PageContextInput = z.input<typeof pageContextSchema>;

/** Page titles end with the app's name ("Histórico · Magistral"); the assistant only needs the page part. */
const TITLE_SUFFIX = /\s*·\s*Magistral\s*$/;

export function pageTitleContext(documentTitle: string): PageContextInput {
  return { kind: "pagina", id: null, detail: documentTitle.replace(TITLE_SUFFIX, "").slice(0, MAX_CONTEXT_DETAIL_CHARS) };
}
