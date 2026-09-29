/**
 * Runs once when the Node server boots: checks the settings (a production server with missing or invalid
 * settings stops here with a clear message), then resumes queued batch jobs and background tasks.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnvironment } = await import("@/lib/config/checkEnvironment");
  const isProduction = process.env.NODE_ENV === "production";
  const { errors, warnings } = checkEnvironment(process.env, isProduction);
  for (const warning of warnings) console.warn(`[magistral] ${warning}`);
  if (errors.length > 0) {
    const report = ["[magistral] Configuração inválida:", ...errors.map((error) => `  - ${error}`)].join("\n");
    if (isProduction) {
      console.error(report);
      process.exit(1);
    }
    console.warn(report);
  }

  const { ensureBatchWorkerStarted } = await import("@/lib/batch/getBatchWorker");
  const { ensureTaskWorkerStarted } = await import("@/lib/tasks/getTaskWorker");
  const { getUserRepository } = await import("@/lib/auth/getAuthRepositories");
  const { announceSetupToken } = await import("@/lib/auth/setupToken");
  ensureBatchWorkerStarted();
  ensureTaskWorkerStarted();
  // Until the first admin exists, the code to create it is only in this server's log.
  if (getUserRepository().count() === 0) announceSetupToken();
}
