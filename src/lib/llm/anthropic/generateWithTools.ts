import type Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { LlmOutputError } from "../errors";
import type { TokenUsage } from "../types";
import type { AgentMessage, ToolChatGenerator } from "../tools/types";
import { ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL, REFUSAL_FALLBACK_BETA, REFUSAL_FALLBACK_MODE } from "./config";

function assistantMessage(message: Extract<AgentMessage, { role: "assistant" }>): BetaMessageParam {
  // Within one reply the model's own blocks go back unchanged, so thinking blocks keep their signatures.
  if (message.providerContent) return { role: "assistant", content: message.providerContent as BetaContentBlockParam[] };
  const content: BetaContentBlockParam[] = [];
  if (message.content) content.push({ type: "text", text: message.content });
  for (const call of message.toolCalls) {
    content.push({ type: "tool_use", id: call.id, name: call.name, input: call.arguments ?? {} });
  }
  return { role: "assistant", content };
}

/** Claude wants the results of one step's calls together, in the next user turn. */
function toMessages(messages: AgentMessage[]): BetaMessageParam[] {
  const result: BetaMessageParam[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      result.push({ role: "user", content: message.content });
    } else if (message.role === "assistant") {
      result.push(assistantMessage(message));
    } else {
      const block: BetaToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: message.toolCallId,
        content: message.content,
      };
      const previous = result.at(-1);
      if (previous?.role === "user" && Array.isArray(previous.content)) {
        previous.content.push(block);
      } else {
        result.push({ role: "user", content: [block] });
      }
    }
  }
  return result;
}

/** One agent step over Claude tool use. Claude Opus 5 rejects sampling parameters, so no temperature. */
export function createAnthropicToolGenerator(client: Anthropic): ToolChatGenerator {
  return async ({ system, messages, tools }, options = {}) => {
    const stream = client.beta.messages.stream(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        thinking: { type: "adaptive" },
        betas: [REFUSAL_FALLBACK_BETA],
        fallbacks: REFUSAL_FALLBACK_MODE,
        system,
        messages: toMessages(messages),
        ...(tools.length > 0 && {
          tools: tools.map(({ name, description, parameters }) => ({
            name,
            description,
            input_schema: { ...parameters, type: "object" as const },
          })),
        }),
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
      toolCalls: message.content.flatMap((block) =>
        block.type === "tool_use" ? [{ id: block.id, name: block.name, arguments: block.input }] : [],
      ),
      providerContent: message.content,
      model: message.model,
      usage,
    };
  };
}
