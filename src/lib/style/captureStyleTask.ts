import "server-only";
import { z } from "zod";
import { MAX_DOCUMENT_TEXT_CHARS } from "@/lib/documents/formats";
import { getStyleExtractor } from "@/lib/llm/getStyleExtractor";
import { STYLE_CAPTURE_PATH } from "@/lib/personas/paths";
import type { TaskHandler } from "@/lib/tasks/handler";
import { captureStyleFromText } from "./captureStyle";
import { styleCaptureResultSchema, type StyleCaptureResult } from "./styleCaptureResult";

const PROFILING_LABEL = "Analisando o estilo";

/**
 * The document's text (never the file) is kept with the task only until it finishes; the text is what
 * the model profiles and what the excerpts are verified against.
 */
const styleCapturePayloadSchema = z.object({
  fileName: z.string(),
  text: z.string().max(MAX_DOCUMENT_TEXT_CHARS),
});
type StyleCapturePayload = z.infer<typeof styleCapturePayloadSchema>;

/** The capture page restores a finished task from this link. */
export function styleCaptureTaskPath(taskId: string): string {
  return `${STYLE_CAPTURE_PATH}?tarefa=${encodeURIComponent(taskId)}`;
}

export const captureStyleTask: TaskHandler<StyleCapturePayload, StyleCaptureResult> = {
  kind: "style.capture",
  lane: "llm",
  payloadSchema: styleCapturePayloadSchema,
  resultSchema: styleCaptureResultSchema,

  async run({ payload, signal, reportProgress }) {
    reportProgress(0, null, PROFILING_LABEL);
    return captureStyleFromText(getStyleExtractor(), payload.fileName, payload.text, { signal });
  },

  describeSuccess: (result, task) => ({
    level: "success",
    title: "Estilo capturado",
    body: `Sugestões de persona prontas para ${result.fileName}.`,
    href: styleCaptureTaskPath(task.id),
  }),
  describeFailure: (message, task) => ({
    level: "error",
    title: "A captura de estilo falhou",
    body: message,
    href: styleCaptureTaskPath(task.id),
  }),
};
