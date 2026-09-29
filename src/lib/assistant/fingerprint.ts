import { createHash } from "node:crypto";

/** A digest of what an action was proposed on, to refuse running it once that changed. */
export function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
