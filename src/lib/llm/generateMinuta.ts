import type { MinutaRequest } from "@/lib/minuta/schema";
import type { Persona } from "@/lib/personas/types";
import type { ContextSource } from "@/lib/rag/selectContext";
import { buildSystemPrompt } from "@/lib/prompt/buildSystemPrompt";
import { buildUserPrompt } from "@/lib/prompt/buildUserPrompt";
import { MinutaGenerationError } from "./errors";
import type { MinutaGenerator } from "./types";

/** Builds the prompts, runs the provider's generator and returns the trimmed Markdown. */
export async function generateMinuta(
  generate: MinutaGenerator,
  request: MinutaRequest,
  persona: Persona,
  librarySources: ContextSource[] = [],
): Promise<string> {
  const { text } = await generate({
    system: buildSystemPrompt(persona, { withLibrary: librarySources.length > 0 }),
    user: buildUserPrompt(request, librarySources),
    temperature: persona.temperature,
  });
  const markdown = text.trim();
  if (!markdown) throw new MinutaGenerationError("empty");

  return markdown;
}
