import "server-only";
import { z } from "zod";
import { ChatBusyError } from "@/lib/chat/errors";
import { getChatRepository } from "@/lib/chat/getChatRepository";
import {
  CONVERSATION_NOT_FOUND_MESSAGE,
  STEP_ALREADY_DECIDED_MESSAGE,
  STEP_NOT_FOUND_MESSAGE,
} from "@/lib/chat/messages";
import type { StepOutcome } from "@/lib/chat/repository";
import { startReply } from "@/lib/chat/startReply";
import { AppError } from "@/lib/errors/AppError";
import { toPublicError } from "@/lib/errors/toPublicError";
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from "@/lib/http/status";
import { logEvent } from "@/lib/log";
import { findActionTool } from "./getAssistantTools";
import type { StepDecision } from "./stepDecisions";


const REJECTED_OUTPUT = "A ação não foi executada.";
const TOOL_UNAVAILABLE_MESSAGE = "Esta ação não está mais disponível.";

/** How runAgent stores a proposed action: what the model asked for and what `propose` returned. */
const storedActionSchema = z.object({ input: z.unknown(), state: z.unknown() });

interface StepRequest {
  ownerId: string;
  conversationId: string;
  stepId: number;
  decision: StepDecision;
}

async function runConfirmed(tool: string, storedInput: unknown, context: { ownerId: string; conversationId: string }): Promise<StepOutcome> {
  try {
    const action = findActionTool(tool);
    if (!action) throw new AppError(HTTP_CONFLICT, TOOL_UNAVAILABLE_MESSAGE);
    const { input, state } = storedActionSchema.parse(storedInput);
    const outcome = await action.execute(action.input.parse(input), state, context);
    return { status: "confirmed", output: outcome.output, card: outcome.card };
  } catch (error) {
    if (!(error instanceof AppError)) logEvent("error", "assistant.action_failed", { tool }, error);
    return { status: "failed", output: toPublicError(error).message };
  }
}

/**
 * Carries out the user's decision on an action the assistant proposed: runs it (or not), records what
 * came of it and queues the assistant's follow-up reply, which tells the user the outcome. Returns the
 * follow-up's task id.
 */
export async function decideStep({ ownerId, conversationId, stepId, decision }: StepRequest): Promise<string> {
  const chats = getChatRepository();
  const conversation = chats.get(conversationId, ownerId);
  if (!conversation) throw new AppError(HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND_MESSAGE);
  const step = chats.getStep(conversationId, stepId);
  if (!step || step.kind !== "action") throw new AppError(HTTP_NOT_FOUND, STEP_NOT_FOUND_MESSAGE);
  if (step.status !== "awaiting_confirmation") throw new AppError(HTTP_CONFLICT, STEP_ALREADY_DECIDED_MESSAGE);
  if (conversation.isReplying) throw new ChatBusyError();
  // Taken before running, so a double click can't run the action twice.
  if (!chats.claimStep(stepId, decision === "confirm" ? "confirmed" : "rejected")) {
    throw new AppError(HTTP_CONFLICT, STEP_ALREADY_DECIDED_MESSAGE);
  }

  const outcome: StepOutcome =
    decision === "confirm"
      ? await runConfirmed(step.tool, step.input, { ownerId, conversationId })
      : { status: "rejected", output: REJECTED_OUTPUT };
  chats.recordStepOutcome(stepId, outcome);

  const { replyId } = chats.addContinuation(conversationId);
  return startReply(chats, { ownerId, conversationId, replyId, title: conversation.title });
}
