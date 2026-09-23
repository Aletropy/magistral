/** Resumes queued batch jobs as soon as the server starts, not only when someone opens /lotes. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureBatchWorkerStarted } = await import("@/lib/batch/getBatchWorker");
  ensureBatchWorkerStarted();
}
