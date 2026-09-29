import type { GenerationOptions, TokenUsage } from "../types";

/** A tool the model may call, described for the provider: name, pt-BR description and JSON Schema input. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** One call the model asked for. `arguments` is the parsed JSON, or the raw text when it wasn't JSON. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

/**
 * A turn of an agent conversation. Assistant turns keep the provider's own content (`providerContent`)
 * so thinking and signatures go back unchanged within one reply; across replies only text is kept.
 */
export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls: ToolCall[]; providerContent?: unknown }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface AgentPrompt {
  system: string;
  messages: AgentMessage[];
  /** Empty asks for a final text answer. */
  tools: ToolDefinition[];
  temperature: number;
}

export interface AgentStepResult {
  text: string;
  toolCalls: ToolCall[];
  /** The assistant turn as the provider returned it, for the next step of the same reply. */
  providerContent?: unknown;
  model: string;
  usage: TokenUsage;
}

/** One model step with tools: either text, tool calls, or both. */
export type ToolChatGenerator = (prompt: AgentPrompt, options?: GenerationOptions) => Promise<AgentStepResult>;

/** Parses a tool call's JSON arguments; malformed JSON is kept as text so validation can report it. */
export function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
