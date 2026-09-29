import { decideStep } from "@/lib/assistant/decideStep";
import { stepDecisionSchema } from "@/lib/assistant/stepDecisions";
import { STEP_NOT_FOUND_MESSAGE } from "@/lib/chat/messages";
import type { TaskCreatedResponseBody } from "@/lib/http/contracts";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_ACCEPTED, HTTP_NOT_FOUND } from "@/lib/http/status";

type Context = RouteContext<"/api/chat/conversations/[id]/steps/[stepId]">;

/** Confirms or rejects an action the Advogado IA proposed; answers with the task of its follow-up reply. */
export const POST = defineRoute({ body: stepDecisionSchema }, async ({ user, body }, ctx: Context) => {
  const { id, stepId } = await ctx.params;
  const step = Number(stepId);
  if (!Number.isInteger(step)) return errorResponse(HTTP_NOT_FOUND, STEP_NOT_FOUND_MESSAGE);
  const taskId = await decideStep({ ownerId: user.id, conversationId: id, stepId: step, decision: body.decision });
  return Response.json({ taskId } satisfies TaskCreatedResponseBody, { status: HTTP_ACCEPTED });
});
