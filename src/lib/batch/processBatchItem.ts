import "server-only";
import { draftMinuta } from "@/lib/minuta/draftMinuta";
import { MinutaRequestError } from "@/lib/minuta/errors";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { fillRequestTemplate } from "./template";
import type { ClaimedBatchItem } from "./types";

/** Fills the job template with the item's row, validates it like the form does, and drafts the minuta. */
export async function processBatchItem(item: ClaimedBatchItem, signal: AbortSignal): Promise<string> {
  const parsed = minutaRequestSchema.safeParse(fillRequestTemplate(item.template, item.row));
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new MinutaRequestError(`Dados da linha inválidos (${issue.path.join(".")}): ${issue.message}`);
  }
  const { result } = await draftMinuta(parsed.data, "batch", { signal });
  return result.markdown;
}
