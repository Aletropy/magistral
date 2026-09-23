export interface MinutaPrompt {
  system: string;
  user: string;
}

/** Provider-specific call that turns a prompt into the minuta's Markdown, or throws. */
export type MinutaGenerator = (prompt: MinutaPrompt) => Promise<string>;
