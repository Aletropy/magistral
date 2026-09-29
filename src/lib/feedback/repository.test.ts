import { describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createFeedbackRepository } from "./repository";

describe("createFeedbackRepository", () => {
  it("lists open reports first with their author and resolves them", () => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    const ana = insertTestUser(db, "ana");
    const feedback = createFeedbackRepository(db);
    const first = feedback.create(ana, "/minutas/nova", "O botão não respondeu.");
    feedback.create(ana, "/historico", "Seria bom filtrar por data.");

    expect(feedback.countOpen()).toBe(2);
    expect(feedback.setResolved(first, new Date("2026-09-28T12:00:00Z"))).toBe(true);
    expect(feedback.countOpen()).toBe(1);
    expect(feedback.list(10).map((item) => [item.page, item.author, item.resolvedAt !== null])).toEqual([
      ["/historico", "ana", false],
      ["/minutas/nova", "ana", true],
    ]);
    expect(feedback.setResolved(999, null)).toBe(false);
  });
});
