import { feedbackInputSchema } from "@/lib/feedback/schema";
import { getFeedbackRepository } from "@/lib/feedback/getFeedbackRepository";
import { defineRoute } from "@/lib/http/route";
import { HTTP_CREATED } from "@/lib/http/status";

/** A tester's report or suggestion, with the page they were on. */
export const POST = defineRoute({ body: feedbackInputSchema, sensitive: true }, ({ user, body }) => {
  const id = getFeedbackRepository().create(user.id, body.page, body.message);
  return Response.json({ id }, { status: HTTP_CREATED });
});
