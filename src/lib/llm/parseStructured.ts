import type { z } from "zod";
import { MinutaGenerationError } from "./errors";
import type { TokenUsage } from "./types";

/** Validates a model's JSON answer; anything malformed is an "invalid_output" failure that keeps the usage. */
export function parseStructured<T>(schema: z.ZodType<T>, json: string | null | undefined, usage: TokenUsage): T {
  try {
    return schema.parse(JSON.parse(json ?? ""));
  } catch {
    throw new MinutaGenerationError("invalid_output", usage);
  }
}
