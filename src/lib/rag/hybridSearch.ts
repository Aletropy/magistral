import type { Embedder } from "@/lib/llm/gemini/embed";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";
import type { LibraryRepository } from "./repository";
import type { LibraryChunk } from "./types";

/** The standard RRF damping constant: higher values flatten the advantage of top ranks. */
export const RRF_K = 60;
/** Candidates taken from each ranking before fusion. */
export const RETRIEVAL_CANDIDATES = 20;
/** Chunks handed to the model after fusion. */
export const RETRIEVAL_TOP_N = 8;

const MIN_TERM_CHARS = 3;
const MAX_QUERY_TERMS = 30;
const WORD = /[\p{L}\p{N}]+/gu;
const STOPWORDS = new Set([
  "que", "para", "com", "por", "uma", "dos", "das", "nos", "nas", "sobre", "entre", "como", "mais",
  "sem", "sua", "seu", "suas", "seus", "este", "esta", "isso", "pela", "pelo", "pelas", "pelos",
  "ser", "sao", "tem", "ter", "caso", "qualquer", "deve", "devem", "contrato", "parte", "partes",
]);

/** Fuses several ranked id lists: each id scores the sum of 1 / (k + rank) over the lists it appears in. */
export function reciprocalRankFusion(rankings: number[][], k: number = RRF_K): number[] {
  const scores = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Turns free text into a safe FTS5 query: distinct quoted terms joined by OR; null if nothing is left. */
export function toFtsQuery(text: string): string | null {
  const terms = [...new Set(normalizeForMatch(text).match(WORD) ?? [])]
    .filter((term) => term.length >= MIN_TERM_CHARS && !STOPWORDS.has(term))
    .slice(0, MAX_QUERY_TERMS);
  return terms.length > 0 ? terms.map((term) => `"${term}"`).join(" OR ") : null;
}

/** Keyword (BM25) and semantic (vector) search over the library, merged with Reciprocal Rank Fusion. */
export async function hybridSearch(
  library: LibraryRepository,
  embed: Embedder,
  query: string,
  topN: number = RETRIEVAL_TOP_N,
): Promise<LibraryChunk[]> {
  const ftsQuery = toFtsQuery(query);
  const keywordIds = ftsQuery ? library.keywordSearch(ftsQuery, RETRIEVAL_CANDIDATES) : [];
  const {
    embeddings: [queryEmbedding],
  } = await embed([query], "query");
  const vectorIds = library.vectorSearch(queryEmbedding, RETRIEVAL_CANDIDATES);

  return library.getChunks(reciprocalRankFusion([keywordIds, vectorIds]).slice(0, topN));
}
