import type Anthropic from "@anthropic-ai/sdk";
import { MinutaGenerationError } from "../errors";
import type { MinutaGenerator, TokenUsage } from "../types";
import {
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
  REFUSAL_FALLBACK_BETA,
  REFUSAL_FALLBACK_MODE,
} from "./config";

/** Claude Opus 5 rejects sampling parameters, so the persona's temperature is not sent. */
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
    // Anthropic bills thinking as output and includes it in output_tokens.
    const usage: TokenUsage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      thinkingTokens: 0,
    };

    if (message.stop_reason === "refusal") throw new MinutaGenerationError("refusal", usage);
    if (message.stop_reason === "max_tokens") throw new MinutaGenerationError("truncated", usage);

    return {
      text: message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""),
      model: message.model,
      usage,
    };
  };
}
