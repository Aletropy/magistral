import type { ConsultedSource } from "@/lib/minuta/types";
import type { ContextSource } from "@/lib/rag/selectContext";

/** A decision used quietly as grounding, numbered [J1], [J2]… like library excerpts are [F1], [F2]…. */
export interface DecisionReference {
  title: string;
  label: string;
}

/** Numbers the excerpts and decisions of one reply, so each search continues where the last one stopped. */
export interface CitationRegistry {
  /** Gives each excerpt its [Fn] reference; an excerpt already given keeps the reference it has. */
  add(sources: Omit<ContextSource, "ref">[]): ContextSource[];
  /** Gives each decision its [Jn] reference, likewise stable for one already seen. */
  addDecisions(decisions: DecisionReference[]): string[];
  consulted(): ConsultedSource[];
}

export function createCitationRegistry(): CitationRegistry {
  const excerpts = new Map<string, ContextSource>();
  const decisions = new Map<string, ConsultedSource>();
  const keyOf = (source: Omit<ContextSource, "ref">) => `${source.title}\u0000${source.label}\u0000${source.text}`;

  return {
    add(sources) {
      return sources.map((source) => {
        const key = keyOf(source);
        const existing = excerpts.get(key);
        if (existing) return existing;
        const numbered = { ...source, ref: `F${excerpts.size + 1}` };
        excerpts.set(key, numbered);
        return numbered;
      });
    },
    addDecisions: (items) =>
      items.map(({ title, label }) => {
        const key = `${title}\u0000${label}`;
        const existing = decisions.get(key);
        if (existing) return existing.ref;
        const ref = `J${decisions.size + 1}`;
        decisions.set(key, { ref, title, label });
        return ref;
      }),
    consulted: () => [
      ...[...excerpts.values()].map(({ ref, title, label }) => ({ ref, title, label })),
      ...decisions.values(),
    ],
  };
}
