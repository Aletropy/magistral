import { feedbackUpdateSchema } from "@/lib/feedback/schema";
import { getFeedbackRepository } from "@/lib/feedback/getFeedbackRepository";
import { errorResponse } from "@/lib/http/responses";
import { defineRoute } from "@/lib/http/route";
import { HTTP_NOT_FOUND, HTTP_NO_CONTENT } from "@/lib/http/status";

const FEEDBACK_NOT_FOUND_MESSAGE = "Relato não encontrado.";

/** Marks a report as handled, or opens it again. */
export const PATCH = defineRoute(
  { access: "admin", body: feedbackUpdateSchema, sensitive: true },
  async ({ body }, ctx: RouteContext<"/api/feedback/[id]">) => {
    const id = Number((await ctx.params).id);
    const changed =
      Number.isSafeInteger(id) && getFeedbackRepository().setResolved(id, body.resolved ? new Date() : null);
    if (!changed) return errorResponse(HTTP_NOT_FOUND, FEEDBACK_NOT_FOUND_MESSAGE);
    return new Response(null, { status: HTTP_NO_CONTENT });
  },
);
