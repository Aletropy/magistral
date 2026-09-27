import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { minutaRequestSchema } from "@/lib/minuta/schema";
import { storedResultSchema } from "./schema";
import type { MinutaSummary, NewMinuta, SavedMinuta } from "./types";

const summaryRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  persona_name: z.string(),
  document_type_label: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const fullRowSchema = summaryRowSchema.extend({
  request: z.string(),
  result: z.string(),
  markdown: z.string(),
});

const SUMMARY_COLUMNS = "id, title, persona_name, document_type_label, created_at, updated_at";

/** Every read and write is limited to the minutas of one owner; another user's id reads as missing. */
export interface MinutaRepository {
  create(minuta: NewMinuta): string;
  list(ownerId: string): MinutaSummary[];
  get(id: string, ownerId: string): SavedMinuta | null;
  /** Returns false when the owner has no minuta with this id. */
  updateMarkdown(id: string, ownerId: string, markdown: string): boolean;
  delete(id: string, ownerId: string): boolean;
}

function toSummary(row: unknown): MinutaSummary {
  const parsed = summaryRowSchema.parse(row);
  return {
    id: parsed.id,
    title: parsed.title,
    personaName: parsed.persona_name,
    documentTypeLabel: parsed.document_type_label,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  };
}

export function createMinutaRepository(db: DatabaseSync): MinutaRepository {
  const insert = db.prepare(
    `INSERT INTO minutas (id, owner_id, title, persona_name, document_type_label, request, result, markdown)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectAll = db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM minutas WHERE owner_id = ? ORDER BY created_at DESC`);
  const selectOne = db.prepare("SELECT * FROM minutas WHERE id = ? AND owner_id = ?");
  const update = db.prepare(
    "UPDATE minutas SET markdown = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND owner_id = ?",
  );
  const remove = db.prepare("DELETE FROM minutas WHERE id = ? AND owner_id = ?");

  return {
    create({ ownerId, title, personaName, documentTypeLabel, request, result }) {
      const id = randomUUID();
      // The Markdown lives in its own column so reviews can replace it; the rest of the result is kept as generated.
      const { markdown, ...rest } = result;
      insert.run(id, ownerId, title, personaName, documentTypeLabel, JSON.stringify(request), JSON.stringify(rest), markdown);
      return id;
    },

    list: (ownerId) => selectAll.all(ownerId).map(toSummary),

    get(id, ownerId) {
      const row = selectOne.get(id, ownerId);
      if (!row) return null;
      const parsed = fullRowSchema.parse(row);
      const rest = storedResultSchema.parse(JSON.parse(parsed.result));
      return {
        ...toSummary(row),
        request: minutaRequestSchema.parse(JSON.parse(parsed.request)),
        result: { ...rest, markdown: parsed.markdown },
      };
    },

    updateMarkdown: (id, ownerId, markdown) => update.run(markdown, id, ownerId).changes > 0,
    delete: (id, ownerId) => remove.run(id, ownerId).changes > 0,
  };
}
