import { LlmOutputError } from "../errors";
import type { GenerationResult, TokenUsage } from "../types";
import type { ChatCompletion } from "./api";

/** Finish reasons OpenRouter normalizes across providers ("error" is handled and retried by the client). */
const FINISH_REASON_LENGTH = "length";
const FINISH_REASON_CONTENT_FILTER = "content_filter";

/** Turns a completion into the text, the model that answered and its usage, or throws. */
export function checkCompletion(completion: ChatCompletion): GenerationResult {
  const usage: TokenUsage = {
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    // completion_tokens already includes reasoning; report it apart so it is not billed twice.
    outputTokens:
      (completion.usage?.completion_tokens ?? 0) - (completion.usage?.completion_tokens_details?.reasoning_tokens ?? 0),
    thinkingTokens: completion.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
  };
  const [choice] = completion.choices;

  if (choice.finish_reason === FINISH_REASON_CONTENT_FILTER || choice.message.refusal) {
    throw new LlmOutputError("refusal", usage);
  }
  if (choice.finish_reason === FINISH_REASON_LENGTH) throw new LlmOutputError("truncated", usage);

  return { text: choice.message.content ?? "", model: completion.model, usage };
}
