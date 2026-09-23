import type { MinutaRequest } from "@/lib/minuta/schema";
import type { Persona } from "@/lib/personas/types";
import { buildSystemPrompt } from "@/lib/prompt/buildSystemPrompt";
import { EMPTY_PROMPT_CONTEXT, buildUserPrompt, type UserPromptContext } from "@/lib/prompt/buildUserPrompt";
import { MinutaGenerationError } from "./errors";
import type { MinutaGenerator } from "./types";

/** Builds the prompts, runs the provider's generator and returns the trimmed Markdown. */
export async function generateMinuta(
  generate: MinutaGenerator,
  request: MinutaRequest,
  persona: Persona,
  context: UserPromptContext = EMPTY_PROMPT_CONTEXT,
): Promise<string> {
  const { text } = await generate({
    system: buildSystemPrompt(persona, {
      withLibrary: context.sources.length > 0,
      withApprovedClauses: context.approvedClauses.length > 0,
    }),
    user: buildUserPrompt(request, context),
    temperature: persona.temperature,
  });
  const markdown = text.trim();
  if (!markdown) throw new MinutaGenerationError("empty");

  return markdown;
}
