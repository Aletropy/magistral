/** Environment variables as a plain map, so settings checks can be tested without the process's env. */
export type EnvVars = Readonly<Record<string, string | undefined>>;
