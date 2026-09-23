export const BATCHES_PATH = "/lotes";
export const NEW_BATCH_PATH = `${BATCHES_PATH}/novo`;

export function batchPath(id: string): string {
  return `${BATCHES_PATH}/${encodeURIComponent(id)}`;
}
