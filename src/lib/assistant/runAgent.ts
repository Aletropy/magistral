import { z } from "zod";
import type { NewToolStep } from "@/lib/chat/toolSteps";
import { AppError } from "@/lib/errors/AppError";
import { isAbortError } from "@/lib/llm/abort";
import type { AgentMessage, ToolCall, ToolChatGenerator } from "@/lib/llm/tools/types";
import { taggedBlock } from "@/lib/prompt/taggedBlock";
import { toToolDefinition, type AssistantTool, type ToolContext } from "./tool";

/** Model calls per reply, the final answer included; enough to search, read and propose one action. */
export const MAX_AGENT_STEPS = 8;
/** What one tool result may put into the conversation, unless the tool asks for more. */
export const TOOL_RESULT_MAX_CHARS = 12_000;
const TRUNCATION_NOTE = "\n[… resultado cortado por ser longo demais]";

export const TOOL_RESULT_TAG = "resultado_ferramenta";
/** Told to the model when the step limit forces an answer. */
export const STEP_LIMIT_NOTE =
  "[Aviso automático do Magistral] O limite de consultas desta resposta acabou. Responda agora com o que já encontrou, sem chamar ferramentas.";
/** The reply's text when the model proposed an action without saying anything. */
export const DEFAULT_CONFIRMATION_TEXT = "Preparei a ação abaixo. Confira e confirme para eu continuar.";
export const EMPTY_ANSWER_TEXT = "Não consegui concluir a resposta. Tente perguntar de outro jeito.";
const UNKNOWN_TOOL_MESSAGE = "Ferramenta desconhecida. Use apenas as ferramentas oferecidas.";
const TOOL_FAILED_MESSAGE = "A ferramenta falhou. Continue sem ela ou tente de outro jeito.";
const ONE_ACTION_MESSAGE = "Só uma ação por vez: aguarde a confirmação da ação já proposta.";

export interface AgentRun {
  generator: ToolChatGenerator;
  system: string;
  history: AgentMessage[];
  tools: AssistantTool[];
  temperature: number;
  context: ToolContext;
  /** Called before each tool runs, with its progress label. */
  onProgress?: (label: string) => void;
  maxSteps?: number;
}

export interface AgentResult {
  text: string;
  /** Every tool the reply used, and last the action waiting for confirmation, if any. */
  steps: NewToolStep[];
  /** True when the reply ends with an action the user has to confirm. */
  awaitingConfirmation: boolean;
}

function truncate(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}${TRUNCATION_NOTE}`;
}

function toolResult(call: ToolCall, content: string): AgentMessage {
  return { role: "tool", toolCallId: call.id, name: call.name, content };
}

/** Why a request or a tool failed, in words the model can act on; unexpected failures stay generic. */
function describeFailure(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return TOOL_FAILED_MESSAGE;
}

function invalidInputMessage(error: z.ZodError): string {
  return `Pedido inválido para a ferramenta:\n${z.prettifyError(error)}`;
}

/**
 * The Advogado IA's reply loop: the model reads with tools until it can answer, at most `maxSteps` calls.
 * Reading tools run at once, their results wrapped as data. The first action the model asks for stops
 * the loop: it is saved as a step waiting for the user, and nothing is spent or changed until then.
 */
export async function runAgent(run: AgentRun): Promise<AgentResult> {
  const { generator, system, tools, temperature, context, onProgress, maxSteps = MAX_AGENT_STEPS } = run;
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const definitions = tools.map(toToolDefinition);
  const messages: AgentMessage[] = [...run.history];
  const steps: NewToolStep[] = [];
  const options = { signal: context.signal };

  for (let step = 0; step < maxSteps; step++) {
    const result = await generator({ system, messages, tools: definitions, temperature }, options);
    if (result.toolCalls.length === 0) {
      return { text: result.text.trim() || EMPTY_ANSWER_TEXT, steps, awaitingConfirmation: false };
    }
    messages.push({ role: "assistant", content: result.text, toolCalls: result.toolCalls, providerContent: result.providerContent });

    let pending: NewToolStep | null = null;
    for (const call of result.toolCalls) {
      context.signal.throwIfAborted();
      if (pending) {
        messages.push(toolResult(call, ONE_ACTION_MESSAGE));
        continue;
      }
      const tool = byName.get(call.name);
      if (!tool) {
        messages.push(toolResult(call, UNKNOWN_TOOL_MESSAGE));
        continue;
      }
      const parsed = tool.input.safeParse(call.arguments);
      if (!parsed.success) {
        messages.push(toolResult(call, invalidInputMessage(parsed.error)));
        continue;
      }
      onProgress?.(tool.progressLabel);
      try {
        if (tool.kind === "action") {
          const proposal = await tool.propose(parsed.data, context);
          pending = {
            tool: tool.name,
            kind: "action",
            input: { input: parsed.data, state: proposal.state ?? null },
            summary: proposal.summary,
            status: "awaiting_confirmation",
            output: null,
            card: proposal.card,
          };
          continue;
        }
        const outcome = await tool.run(parsed.data, context);
        const output = truncate(outcome.output, outcome.maxOutputChars ?? TOOL_RESULT_MAX_CHARS);
        messages.push(toolResult(call, taggedBlock(TOOL_RESULT_TAG, output, { ferramenta: tool.name })));
        steps.push({
          tool: tool.name,
          kind: "read",
          input: parsed.data,
          summary: outcome.summary,
          status: "done",
          output: null,
          card: outcome.card ?? null,
        });
      } catch (error) {
        if (isAbortError(error) || context.signal.aborted) throw error;
        const message = describeFailure(error);
        messages.push(toolResult(call, message));
        // A proposal the model got wrong is only reported to it; a reading tool that failed is shown.
        if (tool.kind === "read") {
          steps.push({ tool: tool.name, kind: "read", input: parsed.data, summary: tool.progressLabel, status: "failed", output: message, card: null });
        }
      }
    }

    if (pending) {
      return { text: result.text.trim() || DEFAULT_CONFIRMATION_TEXT, steps: [...steps, pending], awaitingConfirmation: true };
    }
  }

  // Out of steps: one last call for the answer. Tools stay declared (some providers require it once the
  // history has tool calls), and any further call is ignored.
  const final = await generator(
    { system, messages: [...messages, { role: "user", content: STEP_LIMIT_NOTE }], tools: definitions, temperature },
    options,
  );
  return { text: final.text.trim() || EMPTY_ANSWER_TEXT, steps, awaitingConfirmation: false };
}
