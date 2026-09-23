import { errorResponse, parseJsonBody, type MinutaResponseBody } from "@/lib/http/api";
import { draftMinuta } from "@/lib/minuta/draftMinuta";
import { describeDraftingFailure, MinutaRequestError } from "@/lib/minuta/errors";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { titleFromMarkdown } from "@/lib/minutas/titleFromMarkdown";
import { resolveDocumentTypeLabel } from "@/lib/prompt/buildUserPrompt";
import { LibraryIndexMismatchError } from "@/lib/rag/errors";

/** Long contracts with thinking enabled can take minutes to draft. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, minutaRequestSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const { result, personaName } = await draftMinuta(parsed.data, "minuta");
    const documentTypeLabel = resolveDocumentTypeLabel(parsed.data);
    // Every generation goes to the history, so a refresh or a click elsewhere never loses minutes of work.
    const id = getMinutaRepository().create({
      title: titleFromMarkdown(result.markdown, documentTypeLabel),
      personaName,
      documentTypeLabel,
      request: parsed.data,
      result,
    });
    return Response.json({ ...result, id } satisfies MinutaResponseBody);
  } catch (error) {
    if (!(error instanceof MinutaRequestError || error instanceof LibraryIndexMismatchError)) {
      console.error("[api/minuta] generation failed", error);
    }
    const { status, message } = describeDraftingFailure(error);
    return errorResponse(status, message);
  }
}
