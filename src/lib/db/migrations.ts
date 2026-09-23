import type { DatabaseSync } from "node:sqlite";
import { BUILTIN_PERSONAS } from "@/lib/personas/seeds";
import { DEFAULT_STYLE_SLIDERS } from "@/lib/personas/styleSliders";
import { withTransaction } from "./transaction";

export type Migration = (db: DatabaseSync) => void;

function createPersonaTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      system_instruction TEXT NOT NULL,
      tone_parameters TEXT NOT NULL,
      temperature REAL NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE persona_examples (
      persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (persona_id, position)
    );
  `);

  const insertPersona = db.prepare(
    `INSERT INTO personas (id, name, description, system_instruction, tone_parameters, temperature, is_builtin)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertExample = db.prepare(
    "INSERT INTO persona_examples (persona_id, position, content) VALUES (?, ?, ?)",
  );
  for (const persona of BUILTIN_PERSONAS) {
    insertPersona.run(
      persona.id,
      persona.name,
      persona.description,
      persona.systemInstruction,
      JSON.stringify(persona.toneParameters),
      persona.temperature,
    );
    persona.examples.forEach((example, position) => insertExample.run(persona.id, position, example));
  }
}

function createLlmCallsTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE llm_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      operation TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      thinking_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      estimated_cost_usd REAL,
      status TEXT NOT NULL
    );

    CREATE INDEX llm_calls_created_at ON llm_calls (created_at);
  `);
}

function addPersonaStyleControls(db: DatabaseSync): void {
  db.exec(`ALTER TABLE personas ADD COLUMN negative_constraints TEXT NOT NULL DEFAULT '[]'`);
  db.exec(`ALTER TABLE personas ADD COLUMN style_sliders TEXT NOT NULL DEFAULT '{}'`);
  db.prepare("UPDATE personas SET style_sliders = ?").run(JSON.stringify(DEFAULT_STYLE_SLIDERS));
}

function addPersonaStyleProfile(db: DatabaseSync): void {
  db.exec("ALTER TABLE personas ADD COLUMN style_profile TEXT");
}

/** The vector size the library table was first created with (gemini-embedding-2 at 768). Frozen history. */
const INITIAL_EMBEDDING_DIMENSIONS = 768;
const INITIAL_EMBEDDING_MODEL = "gemini-embedding-2";

function createLibraryTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE library_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      file_name TEXT NOT NULL,
      folder_path TEXT UNIQUE,
      sha256 TEXT NOT NULL UNIQUE,
      char_count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE library_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES library_sources(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      label TEXT NOT NULL,
      context TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE INDEX library_chunks_source ON library_chunks (source_id, position);

    CREATE VIRTUAL TABLE library_chunks_fts USING fts5(
      label, context, text,
      content = 'library_chunks', content_rowid = 'id',
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE VIRTUAL TABLE library_chunk_vectors USING vec0(
      embedding float[${INITIAL_EMBEDDING_DIMENSIONS}] distance_metric=cosine
    );

    CREATE TRIGGER library_chunks_after_insert AFTER INSERT ON library_chunks BEGIN
      INSERT INTO library_chunks_fts (rowid, label, context, text) VALUES (new.id, new.label, new.context, new.text);
    END;

    CREATE TRIGGER library_chunks_after_delete AFTER DELETE ON library_chunks BEGIN
      INSERT INTO library_chunks_fts (library_chunks_fts, rowid, label, context, text)
        VALUES ('delete', old.id, old.label, old.context, old.text);
      DELETE FROM library_chunk_vectors WHERE rowid = old.id;
    END;
  `);
}

function createClausesTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE clauses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      document_types TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

function createBatchTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE batch_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      request_template TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      label TEXT NOT NULL,
      row_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      markdown TEXT,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX batch_items_job ON batch_items (job_id, position);
    CREATE INDEX batch_items_queue ON batch_items (status, next_attempt_at);
  `);
}

function createLibraryMetaTable(db: DatabaseSync): void {
  db.exec("CREATE TABLE library_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  // Libraries indexed before this migration were embedded with Gemini.
  const hasChunks = db.prepare("SELECT 1 FROM library_chunks LIMIT 1").get();
  if (hasChunks) {
    const insert = db.prepare("INSERT INTO library_meta (key, value) VALUES (?, ?)");
    insert.run("embedding_model", INITIAL_EMBEDDING_MODEL);
    insert.run("embedding_dimensions", String(INITIAL_EMBEDDING_DIMENSIONS));
  }
}

function createMinutasTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE minutas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      persona_name TEXT NOT NULL,
      document_type_label TEXT NOT NULL,
      request TEXT NOT NULL,
      result TEXT NOT NULL,
      markdown TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX minutas_created_at ON minutas (created_at);
  `);
}

function createTaskTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      lane TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payload TEXT NOT NULL,
      result TEXT,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      progress_current INTEGER,
      progress_total INTEGER,
      progress_label TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      started_at TEXT,
      finished_at TEXT
    );
    CREATE INDEX tasks_queue ON tasks (lane, status, next_attempt_at);
    CREATE INDEX tasks_created_at ON tasks (created_at);

    CREATE TABLE task_files (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      bytes BLOB NOT NULL,
      outcome TEXT,
      PRIMARY KEY (task_id, position)
    );

    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      read_at TEXT
    );
    CREATE INDEX notifications_unread ON notifications (read_at);

    ALTER TABLE batch_jobs ADD COLUMN notified_at TEXT;
  `);
}

/** Ordered schema changes. Append new migrations; never edit or reorder existing ones. */
export const MIGRATIONS: readonly Migration[] = [
  createPersonaTables,
  createLlmCallsTable,
  addPersonaStyleControls,
  addPersonaStyleProfile,
  createLibraryTables,
  createClausesTable,
  createBatchTables,
  createLibraryMetaTable,
  createMinutasTable,
  createTaskTables,
];

function readSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

/** Applies every migration newer than the database's `user_version`, each in its own transaction. */
export function runMigrations(db: DatabaseSync, migrations: readonly Migration[] = MIGRATIONS): void {
  for (let version = readSchemaVersion(db); version < migrations.length; version++) {
    withTransaction(db, () => {
      migrations[version](db);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
