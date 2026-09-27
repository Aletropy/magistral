import { LlmOutputError } from "@/lib/llm/errors";
import type { MinutaGenerator } from "@/lib/llm/types";
import type { PersonaStyle } from "@/lib/personas/types";
import { buildPlaygroundPrompt } from "./buildPlaygroundPrompt";

/** Rewrites the sample text in the persona's style and returns the trimmed Markdown. */
export async function rewriteSample(
  generate: MinutaGenerator,
  style: PersonaStyle,
  temperature: number,
  sampleText: string,
): Promise<string> {
  const { text } = await generate(buildPlaygroundPrompt(style, temperature, sampleText));
  const markdown = text.trim();
  if (!markdown) throw new LlmOutputError("empty");
  return markdown;
}
