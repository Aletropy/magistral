export const CLAUSES_PATH = "/clausulas";
export const NEW_CLAUSE_PATH = `${CLAUSES_PATH}/nova`;

export function clauseEditPath(id: string): string {
  return `${CLAUSES_PATH}/${encodeURIComponent(id)}`;
}
