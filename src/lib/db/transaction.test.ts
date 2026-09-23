import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { withTransaction } from "./transaction";

function count(db: DatabaseSync): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM notes").get() as { n: number }).n;
}

describe("withTransaction", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE notes (body TEXT)");
  });

  it("commits the work and rolls it back when it throws", () => {
    withTransaction(db, () => db.exec("INSERT INTO notes VALUES ('a')"));
    expect(() =>
      withTransaction(db, () => {
        db.exec("INSERT INTO notes VALUES ('b')");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(count(db)).toBe(1);
    expect(db.isTransaction).toBe(false);
  });

  it("nests with a savepoint that commits together with the outer transaction", () => {
    withTransaction(db, () => {
      db.exec("INSERT INTO notes VALUES ('outer')");
      withTransaction(db, () => db.exec("INSERT INTO notes VALUES ('inner')"));
    });
    expect(count(db)).toBe(2);
  });

  it("undoes only the inner work when a nested transaction fails and the caller recovers", () => {
    withTransaction(db, () => {
      db.exec("INSERT INTO notes VALUES ('outer')");
      try {
        withTransaction(db, () => {
          db.exec("INSERT INTO notes VALUES ('inner')");
          throw new Error("inner failed");
        });
      } catch {
        // The outer transaction keeps going.
      }
    });
    expect(count(db)).toBe(1);
  });

  it("rolls back nested work when the outer transaction fails", () => {
    expect(() =>
      withTransaction(db, () => {
        withTransaction(db, () => db.exec("INSERT INTO notes VALUES ('inner')"));
        throw new Error("outer failed");
      }),
    ).toThrow("outer failed");
    expect(count(db)).toBe(0);
  });
});
