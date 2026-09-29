import type { ChatTurn } from "@/lib/llm/types";
import type { ChatToolStep } from "./toolSteps";
import type { ChatMessage } from "./types";

/** About 15k tokens of history: enough context for a long consultation, well within every model's window. */
export const CHAT_HISTORY_MAX_CHARS = 60_000;
const CITATION = /\[([FJ]\d+)\]/g;
/** Models sometimes cite with other brackets (【F1】, ［F1］) or a space inside ([ F1 ]). */
const LOOSE_CITATION = /[\[【［]\s*([FJ]\d+)\s*[\]】］]/g;
const TURN_SEPARATOR = "\n\n";

const TRANSCRIPT_SPEAKERS: Record<ChatMessage["role"], string> = { user: "Usuário", assistant: "Advogado IA" };

/** Rewrites every citation variant as [F1] or [J1], the form the sources list and later turns rely on. */
export function normalizeCitations(answer: string): string {
  return answer.replace(LOOSE_CITATION, "[$1]");
}

/**
 * Each reply gets its own source list, so "[F1]" in an old answer means a different excerpt than "[F1]"
 * now. Old citations are spelled out with the source's title before the answer goes back to the model.
 */
export function rewritePastCitations(message: Pick<ChatMessage, "content" | "sources">): string {
  const byRef = new Map(message.sources.map((source) => [source.ref, source]));
  return message.content.replace(CITATION, (citation, ref: string) => {
    const source = byRef.get(ref);
    return source ? `[${source.title}, ${source.label}]` : citation;
  });
}

const STEP_STATUS_WORDS: Record<ChatToolStep["status"], string> = {
  done: "concluída",
  failed: "falhou",
  awaiting_confirmation: "aguardando confirmação",
  confirmed: "confirmada",
  rejected: "recusada",
};

/** Past tool use, replayed as text: providers get no tool history across replies, only what was done. */
function describeSteps(steps: ChatToolStep[]): string {
  const lines = steps.map((step) => `- ${step.tool}: ${step.summary} (${STEP_STATUS_WORDS[step.status]})`);
  return `(Ferramentas usadas nesta resposta:\n${lines.join("\n")})`;
}

/** The outcome of an action the user decided on, told to the model as a notice from the app. */
function describeDecision(step: ChatToolStep): string | null {
  if (step.kind !== "action" || step.status === "awaiting_confirmation") return null;
  const verb = step.status === "rejected" ? "recusou" : "confirmou";
  const outcome = step.output ? ` Resultado: ${step.output}` : "";
  return `[Aviso automático do Magistral, não escrito pelo usuário] O usuário ${verb} a ação “${step.summary}”.${outcome}`;
}

/** Finished turns with the tools each reply used, and the user's decisions on the actions it proposed. */
function turnsWithSteps(messages: ChatMessage[]): ChatTurn[] {
  return finishedTurns(messages).flatMap(({ role, content, steps }): ChatTurn[] => {
    if (steps.length === 0) return [{ role, content }];
    const decisions = steps.map(describeDecision).filter((notice) => notice !== null);
    return [
      { role, content: `${content}\n\n${describeSteps(steps)}` },
      ...decisions.map((notice) => ({ role: "user" as const, content: notice })),
    ];
  });
}

function finishedTurns(messages: ChatMessage[]): (ChatTurn & { steps: ChatToolStep[] })[] {
  return messages
    .filter((message) => message.status === "done" && message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.role === "assistant" ? rewritePastCitations(message) : message.content,
      steps: message.steps,
    }));
}

function length(turns: ChatTurn[]): number {
  return turns.reduce((total, turn) => total + turn.content.length, 0);
}

/**
 * The conversation as providers accept it: pending and failed replies dropped, consecutive turns of one
 * role merged, starting and ending with a user turn, and the oldest turns dropped past `maxChars`.
 */
export function normalizeChatHistory(messages: ChatMessage[], maxChars: number = CHAT_HISTORY_MAX_CHARS): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const turn of turnsWithSteps(messages)) {
    const previous = turns.at(-1);
    if (previous?.role === turn.role) previous.content += `${TURN_SEPARATOR}${turn.content}`;
    else turns.push({ ...turn });
  }
  while (turns.at(-1)?.role === "assistant") turns.pop();
  while (turns.length > 1 && length(turns) > maxChars) turns.shift();
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

/** The conversation as plain text, newest part kept, for reading it into a minuta form. */
export function buildTranscript(messages: ChatMessage[], maxChars: number = CHAT_HISTORY_MAX_CHARS): string {
  const lines = finishedTurns(messages).map((turn) => `${TRANSCRIPT_SPEAKERS[turn.role]}: ${turn.content}`);
  while (lines.length > 1 && lines.join(TURN_SEPARATOR).length > maxChars) lines.shift();
  return lines.join(TURN_SEPARATOR);
}
