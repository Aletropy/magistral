import { z } from "zod";

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

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatRequest {
  /** Tried in order; OpenRouter falls back to the next model when one fails. */
  models: string[];
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: {
    type: "json_schema";
    json_schema: { name: string; strict: boolean; schema: unknown };
  };
  /** Routes only to providers that honour every parameter sent (needed for structured outputs). */
  provider?: { require_parameters: boolean };
}

/** The one call the app makes to OpenRouter; injectable so tests can fake it. */
export interface OpenRouterClient {
  chat(request: ChatRequest): Promise<ChatCompletion>;
}
