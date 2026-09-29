import { checkEnvironment } from "./checkEnvironment";

/**
 * Logs the settings problems at boot. A production server with errors stops here, so it never serves
 * requests half-configured; a development server only warns.
 */
export function verifyEnvironmentAtBoot(env: NodeJS.ProcessEnv = process.env): void {
  const isProduction = env.NODE_ENV === "production";
  const { errors, warnings } = checkEnvironment(env, isProduction);
  for (const warning of warnings) console.warn(`[magistral] ${warning}`);
  if (errors.length === 0) return;
  const report = ["[magistral] Configuração inválida:", ...errors.map((error) => `  - ${error}`)].join("\n");
  if (!isProduction) {
    console.warn(report);
    return;
  }
  console.error(report);
  process.exit(1);
}
