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

/** Provider-specific call that turns a prompt into the minuta's Markdown, or throws. */
export type MinutaGenerator = (prompt: MinutaPrompt) => Promise<GenerationResult>;
