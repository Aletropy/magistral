/** Resumes queued batch jobs and background tasks as soon as the server starts, not only on first use. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureBatchWorkerStarted } = await import("@/lib/batch/getBatchWorker");
  const { ensureTaskWorkerStarted } = await import("@/lib/tasks/getTaskWorker");
  const { getUserRepository } = await import("@/lib/auth/getAuthRepositories");
  const { announceSetupToken } = await import("@/lib/auth/setupToken");
  ensureBatchWorkerStarted();
  ensureTaskWorkerStarted();
  // Until the first admin exists, the code to create it is only in this server's log.
  if (getUserRepository().count() === 0) announceSetupToken();
}
