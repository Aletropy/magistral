import { LlmOutputError } from "../errors";
import type { GenerationResult, TokenUsage } from "../types";
import type { ChatCompletion } from "./api";

/** Finish reasons OpenRouter normalizes across providers ("error" is handled and retried by the client). */
const FINISH_REASON_LENGTH = "length";
const FINISH_REASON_CONTENT_FILTER = "content_filter";

/** The tokens a completion billed, with reasoning reported apart. */
export function completionUsage(completion: ChatCompletion): TokenUsage {
  const reasoning = completion.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
  return {
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    // completion_tokens already includes reasoning; report it apart so it is not billed twice.
    outputTokens: (completion.usage?.completion_tokens ?? 0) - reasoning,
    thinkingTokens: reasoning,
  };
}

/** Throws when the completion was refused or cut off; returns its first choice otherwise. */
export function checkFinishReason(completion: ChatCompletion): ChatCompletion["choices"][number] {
  const usage = completionUsage(completion);
  const [choice] = completion.choices;

  if (choice.finish_reason === FINISH_REASON_CONTENT_FILTER || choice.message.refusal) {
    throw new LlmOutputError("refusal", usage);
  }
  if (choice.finish_reason === FINISH_REASON_LENGTH) throw new LlmOutputError("truncated", usage);
  return choice;
}

/** Turns a completion into the text, the model that answered and its usage, or throws. */
export function checkCompletion(completion: ChatCompletion): GenerationResult {
  const choice = checkFinishReason(completion);
  return { text: choice.message.content ?? "", model: completion.model, usage: completionUsage(completion) };
}
