import { z } from "zod";

/**
 * A read step ran by itself; an action waits for the user (`awaiting_confirmation`) and then is
 * `confirmed` (it ran, see its output), `rejected`, or `failed` (it couldn't run, or its request was invalid).
 */
export const TOOL_STEP_STATUSES = ["done", "failed", "awaiting_confirmation", "confirmed", "rejected"] as const;
export type ToolStepStatus = (typeof TOOL_STEP_STATUSES)[number];

/** Reading tools run on their own; actions spend quota or change data, so the user confirms them first. */
export const TOOL_KINDS = ["read", "action"] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];

const MAX_CARD_ROWS = 20;

/** What a step shows under its summary: a link, a list of fields, or the changes proposed for a text. */
export const toolCardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("link"), href: z.string(), label: z.string() }),
  z.object({
    type: z.literal("fields"),
    title: z.string(),
    rows: z.array(z.object({ label: z.string(), value: z.string() })).max(MAX_CARD_ROWS),
  }),
  z.object({ type: z.literal("redline"), title: z.string(), original: z.string(), revised: z.string() }),
]);
export type ToolCard = z.infer<typeof toolCardSchema>;

/** A step as the conversation shows it; the tool's input stays on the server. */
export interface ChatToolStep {
  id: number;
  tool: string;
  kind: ToolKind;
  /** One line in pt-BR, e.g. “Busquei “fiança” na biblioteca”. */
  summary: string;
  status: ToolStepStatus;
  /** What came of it, e.g. the error of a failed action; null while it waits. */
  output: string | null;
  card: ToolCard | null;
  createdAt: string;
}

/** A step recorded when the reply is saved. */
export interface NewToolStep {
  tool: string;
  kind: ToolKind;
  input: unknown;
  summary: string;
  status: ToolStepStatus;
  output: string | null;
  card: ToolCard | null;
}

/** A step read back for confirmation, with the input the action runs with. */
export interface StoredToolStep extends ChatToolStep {
  messageId: number;
  input: unknown;
}
