export interface MinutaPrompt {
  system: string;
  user: string;
  /** Sampling temperature; providers whose models reject it ignore it. */
  temperature: number;
}

/** Provider-specific call that turns a prompt into the minuta's Markdown, or throws. */
export type MinutaGenerator = (prompt: MinutaPrompt) => Promise<string>;
