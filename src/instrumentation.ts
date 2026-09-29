/**
 * Runs once when the Node server boots: checks the settings (a production server with missing or invalid
 * settings stops with a clear message), then resumes queued batch jobs and background tasks. Everything
 * is imported inside the Node.js branch, so the Edge build never sees Node-only APIs.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { verifyEnvironmentAtBoot } = await import("@/lib/config/verifyEnvironmentAtBoot");
  verifyEnvironmentAtBoot();

  const { ensureBatchWorkerStarted } = await import("@/lib/batch/getBatchWorker");
  const { ensureTaskWorkerStarted } = await import("@/lib/tasks/getTaskWorker");
  const { getUserRepository } = await import("@/lib/auth/getAuthRepositories");
  const { announceSetupToken } = await import("@/lib/auth/setupToken");
  ensureBatchWorkerStarted();
  ensureTaskWorkerStarted();
  // Until the first admin exists, the code to create it is only in this server's log.
  if (getUserRepository().count() === 0) announceSetupToken();
}
