import type { Persona, PersonaSummary } from "./types";

/** Strips a persona down to what client components need, keeping prompt text server-side. */
export function toPersonaSummary({ id, name, description }: Persona): PersonaSummary {
  return { id, name, description };
}
