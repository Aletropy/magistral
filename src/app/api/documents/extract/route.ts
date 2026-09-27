import { extractText } from "@/lib/documents/extractText";
import { MAX_SINGLE_UPLOAD_REQUEST_BYTES } from "@/lib/documents/formats";
import { readUploadedDocument } from "@/lib/documents/readUpload";
import type { ExtractTextResponseBody } from "@/lib/http/contracts";
import { defineRoute } from "@/lib/http/route";

/** Returns the plain text of an uploaded PDF or DOCX, e.g. the original a minuta is compared against. */
export const POST = defineRoute({ maxBodyBytes: MAX_SINGLE_UPLOAD_REQUEST_BYTES }, async ({ readForm }) => {
  const text = await extractText(await readUploadedDocument(await readForm()));
  return Response.json({ text } satisfies ExtractTextResponseBody);
});
