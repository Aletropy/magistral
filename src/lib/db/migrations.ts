import type { DatabaseSync } from "node:sqlite";
import { BUILTIN_PERSONAS } from "@/lib/personas/seeds";
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

/** Ordered schema changes. Append new migrations; never edit or reorder existing ones. */
export const MIGRATIONS: readonly Migration[] = [createPersonaTables];

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
