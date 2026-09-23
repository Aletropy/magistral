import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { BUILTIN_PERSONAS } from "@/lib/personas/seeds";
import { MIGRATIONS, runMigrations } from "./migrations";
import { IN_MEMORY_DATABASE, openDatabase } from "./openDatabase";

function schemaVersion(db: DatabaseSync): number {
  return (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
}

describe("runMigrations", () => {
  it("brings a new database to the latest version and seeds the built-in personas", () => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);

    const ids = db.prepare("SELECT id FROM personas WHERE is_builtin = 1 ORDER BY id").all();
    expect(ids.map((row) => row.id)).toEqual(BUILTIN_PERSONAS.map((persona) => persona.id).sort());
  });

  it("skips migrations the database already has", () => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    const extra = vi.fn();
    runMigrations(db, [...MIGRATIONS, extra]);
    runMigrations(db, [...MIGRATIONS, extra]);

    expect(extra).toHaveBeenCalledTimes(1);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length + 1);
  });

  it("rolls back a failing migration and leaves the version unchanged", () => {
    const db = new DatabaseSync(IN_MEMORY_DATABASE);
    const failing = (target: DatabaseSync) => {
      target.exec("CREATE TABLE half_done (id INTEGER)");
      throw new Error("boom");
    };

    expect(() => runMigrations(db, [failing])).toThrow("boom");
    expect(schemaVersion(db)).toBe(0);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").get()).toBeUndefined();
  });
});

describe("legacy chat reconciliation", () => {
  it("moves a prototype's conversations into the chat tables and relabels its usage", () => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    const reconcile = MIGRATIONS.at(-1)!;
    db.exec(`
      DROP TABLE chat_conversation_messages;
      DROP TABLE chat_conversations;
      CREATE TABLE chat_threads (id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, thread_id TEXT NOT NULL, role TEXT NOT NULL,
        content TEXT NOT NULL, sources TEXT, created_at TEXT NOT NULL);
      INSERT INTO chat_threads VALUES ('t1', 'Como crio uma minuta?', '2026-09-23T20:00:00Z', '2026-09-23T20:01:00Z');
      INSERT INTO chat_messages (thread_id, role, content, created_at) VALUES
        ('t1', 'user', 'Como crio uma minuta?', '2026-09-23T20:00:00Z'),
        ('t1', 'assistant', 'Acesse Gerar minuta.', '2026-09-23T20:01:00Z');
      INSERT INTO llm_calls (operation, provider, model, input_tokens, output_tokens, thinking_tokens, latency_ms, status)
        VALUES ('assistant', 'openrouter', 'm', 1, 1, 0, 1, 'ok');
    `);

    reconcile(db);

    expect(db.prepare("SELECT id, title FROM chat_conversations").all()).toEqual([{ id: "t1", title: "Como crio uma minuta?" }]);
    const messages = db.prepare("SELECT role, status FROM chat_conversation_messages ORDER BY id").all();
    expect(messages).toEqual([{ role: "user", status: "done" }, { role: "assistant", status: "done" }]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'chat_threads'").get()).toBeUndefined();
    expect(db.prepare("SELECT operation FROM llm_calls").all()).toEqual([{ operation: "chat" }]);
  });
});
