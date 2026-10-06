/** A Markdown text the model wrote, with the persona's forbidden terms it still used. */
export interface RewriteResult {
  markdown: string;
  /** Forbidden terms of the persona that still appear in the output. */
  forbiddenTermsFound: string[];
}

export interface ConsultedSource {
  ref: string;
  title: string;
  label: string;
}

/** A norm reference the draft cites that the sources did not confirm. */
export interface UnconfirmedReference {
  reference: string;
  reason: string;
}

/** The post-draft citation audit: how many references were checked and which failed. */
export interface ReferenceCheck {
  checked: number;
  unconfirmed: UnconfirmedReference[];
}

/** Everything a generation produced; saved to the history as is. */
export interface DraftResult extends RewriteResult {
  /** Library excerpts the minuta was grounded in; empty when the library was not used. */
  consultedSources: ConsultedSource[];
  /** "full" when the whole library fit in the prompt, "search" when hybrid search picked excerpts. */
  retrievalStrategy: "full" | "search" | null;
  /** The citation audit, or null when there was nothing to check or it could not run. */
  referenceCheck: ReferenceCheck | null;
  /** False when the model moved the approved clauses out of the order the user chose. */
  approvedClauseOrderKept: boolean;
  /** The approved clauses as the user wrote them, in order, so the redline can show what the AI changed. */
  approvedClauses: ApprovedClauseText[];
}

export interface ApprovedClauseText {
  title: string;
  body: string;
}
