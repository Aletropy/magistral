/** One call to a Jurisprudências.ai MCP tool, answering with its text; injectable so tools can be tested. */
export type JurisprudenciasCaller = (
  tool: string,
  args: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<string>;
