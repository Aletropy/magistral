import type { ConsultedSource } from "@/lib/minuta/types";
import type { ContextSource } from "@/lib/rag/selectContext";

/** Numbers the library excerpts of one reply, so each search continues where the last one stopped. */
export interface CitationRegistry {
  /** Gives each excerpt its [Fn] reference; an excerpt already given keeps the reference it has. */
  add(sources: Omit<ContextSource, "ref">[]): ContextSource[];
  consulted(): ConsultedSource[];
}

export function createCitationRegistry(): CitationRegistry {
  const byKey = new Map<string, ContextSource>();
  const keyOf = (source: Omit<ContextSource, "ref">) => `${source.title}\u0000${source.label}\u0000${source.text}`;

  return {
    add(sources) {
      return sources.map((source) => {
        const key = keyOf(source);
        const existing = byKey.get(key);
        if (existing) return existing;
        const numbered = { ...source, ref: `F${byKey.size + 1}` };
        byKey.set(key, numbered);
        return numbered;
      });
    },
    consulted: () => [...byKey.values()].map(({ ref, title, label }) => ({ ref, title, label })),
  };
}
