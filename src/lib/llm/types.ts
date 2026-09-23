export interface MinutaPrompt {
  system: string;
  user: string;
  /** Sampling temperature; providers whose models reject it ignore it. */
  temperature: number;
}

export interface TokenUsage {
  inputTokens: number;
  /** Visible output. Providers that don't report thinking separately include it here. */
  outputTokens: number;
  /** Reasoning tokens billed as output but reported apart (Gemini). */
  thinkingTokens: number;
}

export const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };

export interface GenerationResult {
  text: string;
  /** The model that actually answered (a refusal fallback may differ from the configured one). */
  model: string;
  usage: TokenUsage;
}

export interface GenerationOptions {
  /** Cancels the call; the provider request is aborted and the promise rejects with an abort error. */
  signal?: AbortSignal;
}

/** Provider-specific call that turns a prompt into the minuta's Markdown, or throws. */
export type MinutaGenerator = (prompt: MinutaPrompt, options?: GenerationOptions) => Promise<GenerationResult>;

/** A JSON Schema the answer must follow, with the name providers show in structured-output requests. */
export interface JsonSchemaSpec {
  name: string;
  schema: Record<string, unknown>;
}

/** A call whose answer is JSON following `schema` (the text is parsed and validated by the caller). */
export type StructuredGenerator = (
  prompt: MinutaPrompt,
  schema: JsonSchemaSpec,
  options?: GenerationOptions,
) => Promise<GenerationResult>;
