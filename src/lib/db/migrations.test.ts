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
