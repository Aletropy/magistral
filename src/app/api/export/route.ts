import { EXPORT_FORMAT_INFO, buildFileName } from "@/lib/export/formats";
import { renderDocument } from "@/lib/export/renderDocument";
import { MAX_MARKDOWN_BODY_BYTES, exportRequestSchema } from "@/lib/export/schema";
import { defineRoute } from "@/lib/http/route";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";

export const POST = defineRoute(
  { body: exportRequestSchema, maxBodyBytes: MAX_MARKDOWN_BODY_BYTES },
  async ({ body: { markdown, format } }) => {
    const blocks = parseMarkdown(markdown);
    const file = await renderDocument(blocks, format);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": EXPORT_FORMAT_INFO[format].mimeType,
        "Content-Disposition": `attachment; filename="${buildFileName(blocks, format)}"`,
      },
    });
  },
);
