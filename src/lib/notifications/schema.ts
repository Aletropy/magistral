import { z } from "zod";

/** Mark some notifications as read, or all of them. */
export const markReadSchema = z.union([
  z.object({ ids: z.array(z.number().int().positive()).min(1) }),
  z.object({ all: z.literal(true) }),
]);
export type MarkReadRequest = z.infer<typeof markReadSchema>;
