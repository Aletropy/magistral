import { AppError } from "@/lib/errors/AppError";
import { HTTP_CONFLICT } from "@/lib/http/status";

export const LIBRARY_INDEX_MISMATCH_MESSAGE =
  "A biblioteca foi indexada com outro modelo de busca. Abra Biblioteca e clique em “Reindexar biblioteca”.";

/** The library's vectors come from a different embedding model than the one configured now. */
export class LibraryIndexMismatchError extends AppError {
  constructor() {
    super(HTTP_CONFLICT, LIBRARY_INDEX_MISMATCH_MESSAGE);
  }
}
