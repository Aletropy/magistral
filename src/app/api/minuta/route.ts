import { errorResponse, parseJsonBody, type MinutaResponseBody } from "@/lib/http/api";
import { draftMinuta } from "@/lib/minuta/draftMinuta";
import { describeDraftingFailure, MinutaRequestError } from "@/lib/minuta/errors";
import { minutaRequestSchema } from "@/lib/minuta/schema";

/** Long contracts with thinking enabled can take minutes to draft. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const body = await draftMinuta(parsed.data, "minuta");
    return Response.json(body satisfies MinutaResponseBody);
  } catch (error) {
    if (!(error instanceof MinutaRequestError)) console.error("[api/minuta] generation failed", error);
    const { status, message } = describeDraftingFailure(error);
    return errorResponse(status, message);
  }
}
