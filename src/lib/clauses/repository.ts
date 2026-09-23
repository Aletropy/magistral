import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DOCUMENT_TYPE_IDS } from "@/lib/minuta/documentTypes";
import type { ClauseInput } from "./schema";
import type { Clause } from "./types";

const clauseRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  document_types: z
    .string()
    .transform((json) => JSON.parse(json) as unknown)
    .pipe(z.array(z.enum(DOCUMENT_TYPE_IDS))),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface ClauseRepository {
  list(): Clause[];
  get(id: string): Clause | null;
  /** The clauses with these ids, in the given order; ids that don't exist are skipped. */
  getMany(ids: string[]): Clause[];
  create(input: ClauseInput): Clause;
  update(id: string, input: ClauseInput): Clause | null;
  delete(id: string): boolean;
}

function toClause(row: unknown): Clause {
  const parsed = clauseRowSchema.parse(row);
  return {
    id: parsed.id,
    title: parsed.title,
    category: parsed.category,
    documentTypes: parsed.document_types,
    body: parsed.body,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  };
}

export function createClauseRepository(db: DatabaseSync): ClauseRepository {
  const selectAll = db.prepare("SELECT * FROM clauses ORDER BY category COLLATE NOCASE, title COLLATE NOCASE");
  const selectOne = db.prepare("SELECT * FROM clauses WHERE id = ?");
  const insert = db.prepare("INSERT INTO clauses (id, title, category, document_types, body) VALUES (?, ?, ?, ?, ?)");
  const updateOne = db.prepare(
    `UPDATE clauses SET title = ?, category = ?, document_types = ?, body = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  );
  const deleteOne = db.prepare("DELETE FROM clauses WHERE id = ?");

  function get(id: string): Clause | null {
    const row = selectOne.get(id);
    return row ? toClause(row) : null;
  }

  return {
    list: () => selectAll.all().map(toClause),
    get,
    getMany: (ids) => ids.flatMap((id) => get(id) ?? []),
    create(input) {
      const id = randomUUID();
      insert.run(id, input.title, input.category, JSON.stringify(input.documentTypes), input.body);
      return get(id)!;
    },
    update(id, input) {
      const { changes } = updateOne.run(input.title, input.category, JSON.stringify(input.documentTypes), input.body, id);
      return changes > 0 ? get(id) : null;
    },
    delete: (id) => deleteOne.run(id).changes > 0,
  };
}
