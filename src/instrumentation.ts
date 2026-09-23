/** Resumes queued batch jobs and background tasks as soon as the server starts, not only on first use. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureBatchWorkerStarted } = await import("@/lib/batch/getBatchWorker");
  const { ensureTaskWorkerStarted } = await import("@/lib/tasks/getTaskWorker");
  ensureBatchWorkerStarted();
  ensureTaskWorkerStarted();
}
