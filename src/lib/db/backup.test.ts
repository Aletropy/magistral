import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { backupDatabase } from "./backup";

describe("backupDatabase", () => {
  it("writes one private copy per day and keeps only the newest ones", () => {
    const dir = path.join(mkdtempSync(path.join(tmpdir(), "magistral-backup-")), "copias");
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE notas (texto TEXT); INSERT INTO notas VALUES ('a')");

    const first = backupDatabase(db, dir, new Date("2026-09-20T03:00:00Z"), 2);
    expect(first.written).toMatch(/magistral-2026-09-20\.db$/);
    expect(statSync(first.written!).mode & 0o777).toBe(0o600);
    expect(new DatabaseSync(first.written!).prepare("SELECT texto FROM notas").get()).toEqual({ texto: "a" });
    expect(backupDatabase(db, dir, new Date("2026-09-20T15:00:00Z"), 2).written).toBeNull();

    writeFileSync(path.join(dir, "outro-arquivo.txt"), "fica");
    backupDatabase(db, dir, new Date("2026-09-21T03:00:00Z"), 2);
    const third = backupDatabase(db, dir, new Date("2026-09-22T03:00:00Z"), 2);
    expect(third.removed.map((file) => path.basename(file))).toEqual(["magistral-2026-09-20.db"]);
    expect(readdirSync(dir).sort()).toEqual(["magistral-2026-09-21.db", "magistral-2026-09-22.db", "outro-arquivo.txt"]);
    expect(existsSync(first.written!)).toBe(false);
  });
});
