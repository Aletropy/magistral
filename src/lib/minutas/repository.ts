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
export interface MinutaSearch {
  /** Matched against the title, the document type and the persona, ignoring case. */
  query: string;
  /** Only minutas written with this persona; empty for all. */
  personaName: string;
  limit: number;
  offset: number;
}

export interface MinutaSearchPage {
  items: MinutaSummary[];
  total: number;
}

/** SQLite LIKE treats these as wildcards; a search for "50%" must match them literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export interface MinutaRepository {
  create(minuta: NewMinuta): string;
  list(ownerId: string): MinutaSummary[];
  /** A page of the owner's minutas matching the filters, newest first, with the total that match. */
  search(ownerId: string, filters: MinutaSearch): MinutaSearchPage;
  /** The persona names the owner's minutas were written with, for the history filter. */
  personaNames(ownerId: string): string[];
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
  const SEARCH_FILTER = `owner_id = ?
    AND (? = '' OR lower(title || ' ' || document_type_label || ' ' || persona_name) LIKE ? ESCAPE '\\')
    AND (? = '' OR persona_name = ?)`;
  const searchPage = db.prepare(
    `SELECT ${SUMMARY_COLUMNS} FROM minutas WHERE ${SEARCH_FILTER} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  );
  const searchCount = db.prepare(`SELECT COUNT(*) AS count FROM minutas WHERE ${SEARCH_FILTER}`);
  const selectPersonaNames = db.prepare(
    "SELECT DISTINCT persona_name FROM minutas WHERE owner_id = ? ORDER BY persona_name COLLATE NOCASE",
  );

  return {
    create({ ownerId, title, personaName, documentTypeLabel, request, result }) {
      const id = randomUUID();
      // The Markdown lives in its own column so reviews can replace it; the rest of the result is kept as generated.
      const { markdown, ...rest } = result;
      insert.run(id, ownerId, title, personaName, documentTypeLabel, JSON.stringify(request), JSON.stringify(rest), markdown);
      return id;
    },

    list: (ownerId) => selectAll.all(ownerId).map(toSummary),
    search(ownerId, { query, personaName, limit, offset }) {
      const trimmed = query.trim().toLowerCase();
      const filter = [ownerId, trimmed, `%${escapeLike(trimmed)}%`, personaName, personaName];
      return {
        items: searchPage.all(...filter, limit, offset).map(toSummary),
        total: z.object({ count: z.number() }).parse(searchCount.get(...filter)).count,
      };
    },
    personaNames: (ownerId) =>
      selectPersonaNames.all(ownerId).map((row) => z.object({ persona_name: z.string() }).parse(row).persona_name),

    get(id, ownerId) {
      const row = selectOne.get(id, ownerId);
      if (!row) return null;
      const parsed = fullRowSchema.parse(row);
      const rest = storedResultSchema.parse(JSON.parse(parsed.result));
      return {
        ...toSummary(row),
        request: minutaRequestSchema.parse(JSON.parse(parsed.request)),
        // Rows written before the citation audit have no check stored.
        result: { ...rest, referenceCheck: rest.referenceCheck ?? null, markdown: parsed.markdown },
      };
    },

    updateMarkdown: (id, ownerId, markdown) => update.run(markdown, id, ownerId).changes > 0,
    delete: (id, ownerId) => remove.run(id, ownerId).changes > 0,
  };
}
