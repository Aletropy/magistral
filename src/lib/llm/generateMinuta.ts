import type { MinutaRequest } from "@/lib/minuta/schema";
import type { Persona } from "@/lib/personas/types";
import { buildSystemPrompt } from "@/lib/prompt/buildSystemPrompt";
import { buildUserPrompt } from "@/lib/prompt/buildUserPrompt";
import { MinutaGenerationError } from "./errors";
import type { MinutaGenerator } from "./types";

/** Builds the prompts, runs the provider's generator and returns the trimmed Markdown. */
export async function generateMinuta(
  generate: MinutaGenerator,
  request: MinutaRequest,
  persona: Persona,
): Promise<string> {
  const markdown = (
    await generate({
      system: buildSystemPrompt(persona),
      user: buildUserPrompt(request),
      temperature: persona.temperature,
    })
  ).trim();
  if (!markdown) throw new MinutaGenerationError("empty");

  return markdown;
}
