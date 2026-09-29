import { z } from "zod";
import type { ToolCard } from "@/lib/chat/toolSteps";
import type { ToolDefinition } from "@/lib/llm/tools/types";
import type { CitationRegistry } from "./citations";

/** Who the assistant acts for, and in which conversation. */
export interface ActionContext {
  ownerId: string;
  conversationId: string;
}

/** What a reading tool gets while the reply is being written. */
export interface ToolContext extends ActionContext {
  signal: AbortSignal;
  /** Library excerpts the reply was given, numbered [F1], [F2]… across every search of the reply. */
  citations: CitationRegistry;
}

/** A tool's result: the text for the model, the line the conversation shows, and an optional card. */
export interface ToolOutcome {
  output: string;
  summary: string;
  card?: ToolCard | null;
  /** How much of `output` the model may receive; the default suits lists and search results. */
  maxOutputChars?: number;
}

/** An action as the user is asked to confirm it. `state` is kept to check nothing changed meanwhile. */
export interface ActionProposal {
  summary: string;
  card: ToolCard | null;
  state?: unknown;
}

interface ToolBase<Input> {
  name: string;
  /** pt-BR, for the model: what the tool does and when to use it. */
  description: string;
  input: z.ZodType<Input>;
  /** Shown while the tool runs, e.g. "Buscando na biblioteca". */
  progressLabel: string;
}

export interface ReadToolSpec<Input> extends ToolBase<Input> {
  run(input: Input, context: ToolContext): Promise<ToolOutcome>;
}

export interface ActionToolSpec<Input> extends ToolBase<Input> {
  /** Checks the request and describes it for confirmation; throws an AppError the model is told about. */
  propose(input: Input, context: ToolContext): Promise<ActionProposal>;
  /** Runs the confirmed action; `state` is what `propose` returned. */
  execute(input: Input, state: unknown, context: ActionContext): Promise<ToolOutcome>;
}

/** A tool with its input type erased, so different tools share one registry. */
export type AssistantTool =
  | ({ kind: "read" } & ReadToolSpec<unknown>)
  | ({ kind: "action" } & ActionToolSpec<unknown>);

export function defineReadTool<Input>(spec: ReadToolSpec<Input>): AssistantTool {
  return { kind: "read", ...(spec as unknown as ReadToolSpec<unknown>) };
}

export function defineActionTool<Input>(spec: ActionToolSpec<Input>): AssistantTool {
  return { kind: "action", ...(spec as unknown as ActionToolSpec<unknown>) };
}

/** The tool as providers receive it: name, description and its input as JSON Schema. */
export function toToolDefinition(tool: AssistantTool): ToolDefinition {
  // The `$schema` meta keyword is dropped: some providers' validators reject it.
  const schema = z.toJSONSchema(tool.input, { io: "input" }) as Record<string, unknown>;
  const parameters = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$schema"));
  return { name: tool.name, description: tool.description, parameters };
}
