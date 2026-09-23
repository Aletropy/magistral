import { EXPORT_FORMAT_INFO, buildFileName } from "@/lib/export/formats";
import { renderDocument } from "@/lib/export/renderDocument";
import { exportRequestSchema } from "@/lib/export/schema";
import { errorResponse, parseJsonBody } from "@/lib/http/api";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

const EXPORT_FAILURE_STATUS = 500;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, exportRequestSchema);
  if ("response" in parsed) return parsed.response;

  const { markdown, format } = parsed.data;
  try {
    const blocks = parseMarkdown(markdown);
    const file = await renderDocument(blocks, format);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": EXPORT_FORMAT_INFO[format].mimeType,
        "Content-Disposition": `attachment; filename="${buildFileName(blocks, format)}"`,
      },
    });
  } catch (error) {
    console.error("[api/export] rendering failed", error);
    return errorResponse(EXPORT_FAILURE_STATUS, "Não foi possível gerar o arquivo. Tente novamente.");
  }
}
