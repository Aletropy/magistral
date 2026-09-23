import { ensureBatchWorkerStarted } from "@/lib/batch/getBatchWorker";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { batchRequestSchema } from "@/lib/batch/schema";
import { fillRequestTemplate, rowLabel } from "@/lib/batch/template";
import { HTTP_CREATED, errorResponse, parseJsonBody, type BatchCreatedResponseBody } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

const MAX_LABEL_CHARS = 120;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, batchRequestSchema);
  if ("response" in parsed) return parsed.response;
  const { name, template, rows } = parsed.data;

  try {
    const id = getBatchRepository().createJob(
      name,
      template,
      rows.map((row) => ({
        label: rowLabel(template, fillRequestTemplate(template, row)).slice(0, MAX_LABEL_CHARS),
        row,
      })),
    );
    ensureBatchWorkerStarted().wake();
    return Response.json({ id } satisfies BatchCreatedResponseBody, { status: HTTP_CREATED });
  } catch (error) {
    console.error("[api/batch] create failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
