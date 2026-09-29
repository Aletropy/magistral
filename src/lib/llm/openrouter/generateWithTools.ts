import type { AgentMessage, ToolChatGenerator, ToolDefinition } from "../tools/types";
import { parseToolArguments } from "../tools/types";
import type { ChatMessage, OpenAiTool, OpenRouterClient } from "./api";
import { checkFinishReason, completionUsage } from "./checkCompletion";
import { OPENROUTER_MAX_TOKENS, PRIVATE_ROUTING, type ProviderRouting } from "./config";

function toOpenAiTool({ name, description, parameters }: ToolDefinition): OpenAiTool {
  return { type: "function", function: { name, description, parameters } };
}

function toChatMessage(message: AgentMessage): ChatMessage {
  switch (message.role) {
    case "user":
      return message;
    case "tool":
      return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
    case "assistant":
      return {
        role: "assistant",
        content: message.content || null,
        ...(message.toolCalls.length > 0 && {
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: { name: call.name, arguments: JSON.stringify(call.arguments) },
          })),
        }),
      };
  }
}

/**
 * One agent step over OpenRouter's OpenAI-style tool calling. With tools, only endpoints that support them
 * may serve the request (`require_parameters`), still under the data-retention routing.
 */
export function createOpenRouterToolGenerator(
  client: OpenRouterClient,
  models: string[],
  routing: ProviderRouting = PRIVATE_ROUTING,
): ToolChatGenerator {
  return async ({ system, messages, tools, temperature }, options = {}) => {
    const withTools = tools.length > 0;
    const completion = await client.chat(
      {
        models,
        messages: [{ role: "system", content: system }, ...messages.map(toChatMessage)],
        temperature,
        max_tokens: OPENROUTER_MAX_TOKENS,
        ...(withTools && { tools: tools.map(toOpenAiTool), tool_choice: "auto" as const }),
        provider: withTools ? { ...routing, require_parameters: true } : routing,
      },
      { signal: options.signal },
    );
    const choice = checkFinishReason(completion);
    return {
      text: choice.message.content ?? "",
      toolCalls: (choice.message.tool_calls ?? []).map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: parseToolArguments(call.function.arguments),
      })),
      model: completion.model,
      usage: completionUsage(completion),
    };
  };
}
