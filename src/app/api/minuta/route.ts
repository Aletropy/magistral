import { errorResponse, parseJsonBody, type MinutaResponseBody } from "@/lib/http/api";
import { generateMinuta } from "@/lib/llm/generateMinuta";
import { getMinutaGenerator } from "@/lib/llm/getMinutaGenerator";
import { toErrorResponseInfo } from "@/lib/llm/toErrorResponseInfo";
import { minutaRequestSchema } from "@/lib/minuta/schema";

/** Long contracts with thinking enabled can take minutes to draft. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const markdown = await generateMinuta(getMinutaGenerator(), parsed.data);
    return Response.json({ markdown } satisfies MinutaResponseBody);
  } catch (error) {
    console.error("[api/minuta] generation failed", error);
    const { status, message } = toErrorResponseInfo(error);
    return errorResponse(status, message);
  }
}
