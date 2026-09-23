import { batchZipName, buildBatchZip } from "@/lib/batch/buildZip";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";
import { BATCH_NOT_FOUND_MESSAGE, NOTHING_TO_DOWNLOAD_MESSAGE } from "@/lib/batch/messages";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export/formats";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND, errorResponse } from "@/lib/http/api";
import { UNEXPECTED_ERROR } from "@/lib/llm/errors";

const ZIP_MIME_TYPE = "application/zip";

function isExportFormat(value: string | null): value is ExportFormat {
  return (EXPORT_FORMATS as readonly (string | null)[]).includes(value);
}

/** Every finished minuta of the job as .docx or .pdf files in one ZIP. */
export async function GET(request: Request, ctx: RouteContext<"/api/batch/[id]/download">): Promise<Response> {
  const format = new URL(request.url).searchParams.get("format");
  if (!isExportFormat(format)) return errorResponse(HTTP_BAD_REQUEST, "Formato de exportação inválido.");

  const batches = getBatchRepository();
  const { id } = await ctx.params;
  const job = batches.getJob(id);
  if (!job) return errorResponse(HTTP_NOT_FOUND, BATCH_NOT_FOUND_MESSAGE);
  const items = batches.finishedItems(id);
  if (items.length === 0) return errorResponse(HTTP_BAD_REQUEST, NOTHING_TO_DOWNLOAD_MESSAGE);

  try {
    const zip = await buildBatchZip(items, format);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": ZIP_MIME_TYPE,
        "Content-Disposition": `attachment; filename="${batchZipName(job.name, format)}"`,
      },
    });
  } catch (error) {
    console.error("[api/batch/download] zip failed", error);
    return errorResponse(UNEXPECTED_ERROR.status, UNEXPECTED_ERROR.message);
  }
}
