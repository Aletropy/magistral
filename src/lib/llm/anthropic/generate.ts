import type Anthropic from "@anthropic-ai/sdk";
import { LlmOutputError } from "../errors";
import type { ChatGenerator, TokenUsage } from "../types";
import {
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
  REFUSAL_FALLBACK_BETA,
  REFUSAL_FALLBACK_MODE,
} from "./config";

/** Claude Opus 5 rejects sampling parameters, so the persona's temperature is not sent. */
export function createAnthropicChatGenerator(client: Anthropic): ChatGenerator {
  return async ({ system, messages }, options = {}) => {
    const stream = client.beta.messages.stream(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        thinking: { type: "adaptive" },
        betas: [REFUSAL_FALLBACK_BETA],
        fallbacks: REFUSAL_FALLBACK_MODE,
        system,
        messages,
      },
      { signal: options.signal },
    );
    const message = await stream.finalMessage();
    // Anthropic bills thinking as output and includes it in output_tokens.
    const usage: TokenUsage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      thinkingTokens: 0,
    };

    if (message.stop_reason === "refusal") throw new LlmOutputError("refusal", usage);
    if (message.stop_reason === "max_tokens") throw new LlmOutputError("truncated", usage);

    return {
      text: message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""),
      model: message.model,
      usage,
    };
  };
}
