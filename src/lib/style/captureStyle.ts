import { DocumentExtractionError } from "@/lib/documents/errors";
import { extractText, type UploadedDocument } from "@/lib/documents/extractText";
import { MAX_DOCUMENT_TEXT_CHARS } from "@/lib/documents/formats";
import type { StyleExtractor } from "@/lib/llm/gemini/extractStyle";
import {
  MAX_EXAMPLES,
  MAX_EXAMPLE_CHARS,
  MAX_PERSONA_NAME_CHARS,
  MAX_SYSTEM_INSTRUCTION_CHARS,
  MAX_TONE_PARAMETERS,
  MAX_TONE_PARAMETER_CHARS,
} from "@/lib/personas/schema";
import type { StyleProfile } from "./styleProfileSchema";
import { verifyExcerpts } from "./verifyExcerpts";

export interface StyleCaptureResult {
  fileName: string;
  profile: StyleProfile;
  suggestedName: string;
  suggestedSystemInstruction: string;
  suggestedToneParameters: string[];
  /** Verbatim excerpts confirmed to exist in the document, ready to become few-shot examples. */
  excerpts: string[];
  /** How many excerpts the model returned that could not be found in the document. */
  discardedExcerpts: number;
}

function clip(text: string, maxChars: number): string {
  return text.trim().slice(0, maxChars);
}

/** Extracts the document's text, has the model profile its style and trims the suggestions to persona limits. */
export async function captureStyle(extract: StyleExtractor, document: UploadedDocument): Promise<StyleCaptureResult> {
  const text = await extractText(document);
  if (text.length > MAX_DOCUMENT_TEXT_CHARS) throw new DocumentExtractionError("too_long");

  const { extraction } = await extract(text);
  const verified = verifyExcerpts(extraction.keyExcerpts, text, MAX_EXAMPLE_CHARS);

  return {
    fileName: document.name,
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
