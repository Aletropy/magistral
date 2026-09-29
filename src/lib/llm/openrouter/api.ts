import { z } from "zod";
import type { ProviderRouting } from "./config";

/** A non-OK answer from OpenRouter (or a network failure, reported as 503). */
export class OpenRouterApiError extends Error {
  readonly status: number;
  /** OpenRouter's `error.metadata.error_type` when present, e.g. "rate_limit_exceeded". */
  readonly errorType: string | null;

  constructor(status: number, message: string, errorType: string | null = null) {
    super(`OpenRouter ${status}: ${message}`);
    this.name = "OpenRouterApiError";
    this.status = status;
    this.errorType = errorType;
  }
}

export const openRouterErrorBodySchema = z.object({
  error: z.object({
    code: z.union([z.number(), z.string()]).optional(),
    message: z.string().default(""),
    metadata: z.object({ error_type: z.string().optional() }).loose().optional(),
  }),
});

export const chatCompletionSchema = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          content: z.string().nullable(),
          refusal: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                type: z.literal("function"),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      completion_tokens_details: z.object({ reasoning_tokens: z.number().nullish() }).nullish(),
    })
    .nullish(),
});

export type ChatCompletion = z.infer<typeof chatCompletionSchema>;

export interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OpenAiTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatRequest {
  /** Tried in order; OpenRouter falls back to the next model when one fails. */
  models: string[];
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  tools?: OpenAiTool[];
  tool_choice?: "auto" | "none";
  response_format?: {
    type: "json_schema";
    json_schema: { name: string; strict: boolean; schema: unknown };
  };
  /** Which endpoints may serve the request: data policy, and (for structured outputs) parameter support. */
  provider: ProviderRouting & { require_parameters?: boolean };
}

export interface ChatCallOptions {
  /** Aborts the request; the call then rejects with an abort error and is never retried. */
  signal?: AbortSignal;
}

/** The one call the app makes to OpenRouter; injectable so tests can fake it. */
export interface OpenRouterClient {
  chat(request: ChatRequest, options?: ChatCallOptions): Promise<ChatCompletion>;
}
