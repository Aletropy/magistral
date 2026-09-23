import type { ChatGenerator, ChatPrompt, MinutaGenerator, MinutaPrompt } from "./types";

/** A single-turn prompt as a conversation with one user turn. */
export function toChatPrompt({ system, user, temperature }: MinutaPrompt): ChatPrompt {
  return { system, messages: [{ role: "user", content: user }], temperature };
}

/** Every provider implements the conversation call once; single-turn drafting goes through it. */
export function asMinutaGenerator(chat: ChatGenerator): MinutaGenerator {
  return (prompt, options) => chat(toChatPrompt(prompt), options);
}
