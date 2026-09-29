import { z } from "zod";

export const MAX_FEEDBACK_CHARS = 4000;
export const MAX_FEEDBACK_PAGE_CHARS = 300;

export const feedbackInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { error: "Escreva o que aconteceu ou o que você sugere." })
    .max(MAX_FEEDBACK_CHARS, { error: `Use no máximo ${MAX_FEEDBACK_CHARS} caracteres.` }),
  /** The page the tester was on, so the admin can reproduce it. */
  page: z.string().trim().max(MAX_FEEDBACK_PAGE_CHARS),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const feedbackUpdateSchema = z.object({ resolved: z.boolean() });
