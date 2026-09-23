import { DocumentExtractionError } from "@/lib/documents/errors";
import { extractText, type UploadedDocument } from "@/lib/documents/extractText";
import { MAX_DOCUMENT_TEXT_CHARS } from "@/lib/documents/formats";
import type { GenerationOptions } from "@/lib/llm/types";
import type { StyleExtractor } from "@/lib/style/extractor";
import {
  MAX_EXAMPLES,
  MAX_EXAMPLE_CHARS,
  MAX_PERSONA_NAME_CHARS,
  MAX_SYSTEM_INSTRUCTION_CHARS,
  MAX_TONE_PARAMETERS,
  MAX_TONE_PARAMETER_CHARS,
} from "@/lib/personas/schema";
import type { StyleCaptureResult } from "./styleCaptureResult";
import { verifyExcerpts } from "./verifyExcerpts";

function clip(text: string, maxChars: number): string {
  return text.trim().slice(0, maxChars);
}

/** Extracts the reference document's text, rejecting documents too long to profile in one call. */
export async function readStyleDocument(document: UploadedDocument): Promise<string> {
  const text = await extractText(document);
  if (text.length > MAX_DOCUMENT_TEXT_CHARS) throw new DocumentExtractionError("too_long");
  return text;
}

/** Has the model profile the text's style and trims the suggestions to persona limits. */
export async function captureStyleFromText(
  extract: StyleExtractor,
  fileName: string,
  text: string,
  options: GenerationOptions = {},
): Promise<StyleCaptureResult> {
  const { extraction } = await extract(text, options);
  const verified = verifyExcerpts(extraction.keyExcerpts, text, MAX_EXAMPLE_CHARS);

  return {
    fileName,
    profile: extraction.profile,
    suggestedName: clip(extraction.suggestedName, MAX_PERSONA_NAME_CHARS),
    suggestedSystemInstruction: clip(extraction.suggestedSystemInstruction, MAX_SYSTEM_INSTRUCTION_CHARS),
    suggestedToneParameters: extraction.suggestedToneParameters
      .map((rule) => clip(rule, MAX_TONE_PARAMETER_CHARS))
      .filter(Boolean)
      .slice(0, MAX_TONE_PARAMETERS),
    excerpts: verified.slice(0, MAX_EXAMPLES),
    discardedExcerpts: extraction.keyExcerpts.length - verified.length,
  };
}

/** Extracts the document's text, has the model profile its style and trims the suggestions to persona limits. */
export async function captureStyle(extract: StyleExtractor, document: UploadedDocument): Promise<StyleCaptureResult> {
  return captureStyleFromText(extract, document.name, await readStyleDocument(document));
}
