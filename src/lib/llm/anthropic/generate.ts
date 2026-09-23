import type Anthropic from "@anthropic-ai/sdk";
import { MinutaGenerationError } from "../errors";
import type { MinutaGenerator } from "../types";
import {
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
  REFUSAL_FALLBACK_BETA,
  REFUSAL_FALLBACK_MODE,
} from "./config";

export function createAnthropicGenerator(client: Anthropic): MinutaGenerator {
  return async ({ system, user }) => {
    const stream = client.beta.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      thinking: { type: "adaptive" },
      betas: [REFUSAL_FALLBACK_BETA],
      fallbacks: REFUSAL_FALLBACK_MODE,
      system,
      messages: [{ role: "user", content: user }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") throw new MinutaGenerationError("refusal");
    if (message.stop_reason === "max_tokens") throw new MinutaGenerationError("truncated");

    return message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  };
}
