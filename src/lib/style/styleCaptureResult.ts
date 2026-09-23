import { z } from "zod";
import { styleProfileSchema } from "./styleProfileSchema";

export const styleCaptureResultSchema = z.object({
  fileName: z.string(),
  profile: styleProfileSchema,
  suggestedName: z.string(),
  suggestedSystemInstruction: z.string(),
  suggestedToneParameters: z.array(z.string()),
  /** Verbatim excerpts confirmed to exist in the document, ready to become few-shot examples. */
  excerpts: z.array(z.string()),
  /** How many excerpts the model returned that could not be found in the document. */
  discardedExcerpts: z.number(),
});

export type StyleCaptureResult = z.infer<typeof styleCaptureResultSchema>;
