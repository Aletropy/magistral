import { z } from "zod";

/** What a finished draft task stores: the saved minuta's id and title. */
export const draftTaskResultSchema = z.object({ minutaId: z.string(), title: z.string() });
export type DraftTaskResult = z.infer<typeof draftTaskResultSchema>;
