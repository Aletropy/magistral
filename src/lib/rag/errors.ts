export const LIBRARY_INDEX_MISMATCH_MESSAGE =
  "A biblioteca foi indexada com outro modelo de busca. Abra Biblioteca e clique em “Reindexar biblioteca”.";

/** The library's vectors come from a different embedding model than the one configured now. */
export class LibraryIndexMismatchError extends Error {
  constructor() {
    super(LIBRARY_INDEX_MISMATCH_MESSAGE);
    this.name = "LibraryIndexMismatchError";
  }
}
