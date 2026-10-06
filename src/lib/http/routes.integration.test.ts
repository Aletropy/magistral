import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";

vi.mock("server-only", () => ({}));

/** The cookie the "browser" sends; each request sets it for the user making it. */
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
}));

/** The follow-up reply is queued, not written: no model runs in these tests. */
const FOLLOW_UP_TASK_ID = "tarefa-de-continuacao";
vi.mock("@/lib/chat/startReply", () => ({ startReply: vi.fn(() => FOLLOW_UP_TASK_ID) }));

process.env.MAGISTRAL_DATA_DIR = mkdtempSync(path.join(tmpdir(), "magistral-rotas-"));

const { getSessionRepository, getUserRepository } = await import("@/lib/auth/getAuthRepositories");
const { newSessionToken, sessionIdOf } = await import("@/lib/auth/sessionToken");
const { getMinutaRepository } = await import("@/lib/minutas/getMinutaRepository");
const minutaRoute = await import("@/app/api/minutas/[id]/route");
const personaRoute = await import("@/app/api/personas/[id]/route");
const tasksRoute = await import("@/app/api/tasks/route");
const stepRoute = await import("@/app/api/chat/conversations/[id]/steps/[stepId]/route");
const { getChatRepository } = await import("@/lib/chat/getChatRepository");
const { getClauseRepository } = await import("@/lib/clauses/getClauseRepository");

const BASE = "http://localhost:3000";
const HOUR_MS = 60 * 60 * 1000;

function signIn(userId: string): string {
  const token = newSessionToken();
  const now = new Date();
  getSessionRepository().create({
    id: sessionIdOf(token),
    userId,
    expiresAt: new Date(now.getTime() + HOUR_MS),
    userAgent: null,
    now,
  });
  return token;
}

function as(token: string | null, pathname: string, method = "GET"): Request {
  if (token) cookieJar.set(SESSION_COOKIE_NAME, token);
  else cookieJar.clear();
  return new Request(`${BASE}${pathname}`, { method, headers: { host: "localhost:3000", origin: BASE } });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function postAs(token: string, pathname: string, body: unknown): Request {
  cookieJar.set(SESSION_COOKIE_NAME, token);
  return new Request(`${BASE}${pathname}`, {
    method: "POST",
    headers: { host: "localhost:3000", origin: BASE, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API routes with accounts", () => {
  let ana: string;
  let bruno: string;
  let anaId: string;
  let minutaId: string;

  beforeAll(() => {
    const users = getUserRepository();
    const admin = users.createFirstAdmin({ username: "ana", displayName: "Ana", passwordHash: "x" })!;
    const member = users.create({ username: "bruno", displayName: "Bruno", passwordHash: "x", role: "member" });
    anaId = admin.id;
    ana = signIn(admin.id);
    bruno = signIn(member.id);
    minutaId = getMinutaRepository().create({
      ownerId: admin.id,
      title: "CONTRATO",
      personaName: "Moderno",
      documentTypeLabel: "NDA",
      request: {
        documentType: "nda",
        customDocumentType: "",
        parties: [
          { name: "A", role: "Reveladora", qualification: "" },
          { name: "B", role: "Receptora", qualification: "" },
        ],
        clauses: "",
        persona: "moderno",
        useLibrary: false,
        approvedClauseIds: [],
        baseDocument: null,
      },
      result: {
        markdown: "# CONTRATO",
        forbiddenTermsFound: [],
        consultedSources: [],
        retrievalStrategy: null,
        referenceCheck: null,
        approvedClauseOrderKept: true,
        approvedClauses: [],
      },
    });
  });

  it("requires a session", async () => {
    expect((await minutaRoute.GET(as(null, `/api/minutas/${minutaId}`), params(minutaId))).status).toBe(401);
    expect((await minutaRoute.GET(as("forjado", `/api/minutas/${minutaId}`), params(minutaId))).status).toBe(401);
  });

  it("lets only the owner read or delete a minuta", async () => {
    expect((await minutaRoute.GET(as(ana, `/api/minutas/${minutaId}`), params(minutaId))).status).toBe(200);
    expect((await minutaRoute.GET(as(bruno, `/api/minutas/${minutaId}`), params(minutaId))).status).toBe(404);
    expect((await minutaRoute.DELETE(as(bruno, `/api/minutas/${minutaId}`, "DELETE"), params(minutaId))).status).toBe(404);
    expect((await minutaRoute.GET(as(ana, `/api/minutas/${minutaId}`), params(minutaId))).status).toBe(200);
  });

  it("lists only the user's own tasks", async () => {
    const response = await tasksRoute.GET(as(bruno, "/api/tasks"), undefined);
    expect(await response.json()).toEqual({ tasks: [] });
  });

  it("runs a proposed action once, only for the conversation's owner, and queues the follow-up", async () => {
    const chats = getChatRepository();
    const conversationId = chats.createConversation({ ownerId: anaId, title: "Cláusulas", minutaId: null, useLibrary: false, useJurisprudencia: false });
    const { replyId } = chats.addExchange(conversationId, "Crie uma cláusula de multa");
    const clause = { titulo: "Multa por atraso", categoria: "Multa", tiposDocumento: [], texto: "Multa de 2%." };
    chats.completeReply(replyId, "Preparei a cláusula.", [], [
      {
        tool: "criar_clausula",
        kind: "action",
        input: { input: clause, state: null },
        summary: "Criar a cláusula “Multa por atraso”",
        status: "awaiting_confirmation",
        output: null,
        card: null,
      },
    ]);
    const stepId = chats.get(conversationId, anaId)!.messages[1].steps[0].id;
    const path = `/api/chat/conversations/${conversationId}/steps/${stepId}`;
    const stepParams = { params: Promise.resolve({ id: conversationId, stepId: String(stepId) }) };

    expect((await stepRoute.POST(postAs(bruno, path, { decision: "confirm" }), stepParams)).status).toBe(404);
    expect(getClauseRepository().list().some((saved) => saved.title === clause.titulo)).toBe(false);

    const confirmed = await stepRoute.POST(postAs(ana, path, { decision: "confirm" }), stepParams);
    expect(confirmed.status).toBe(202);
    expect(await confirmed.json()).toEqual({ taskId: FOLLOW_UP_TASK_ID });
    expect(getClauseRepository().list().filter((saved) => saved.title === clause.titulo)).toHaveLength(1);
    expect(chats.getStep(conversationId, stepId)).toMatchObject({ status: "confirmed", card: { type: "link" } });

    expect((await stepRoute.POST(postAs(ana, path, { decision: "confirm" }), stepParams)).status).toBe(409);
    expect(getClauseRepository().list().filter((saved) => saved.title === clause.titulo)).toHaveLength(1);
  });

  it("keeps deleting shared personas to admins", async () => {
    expect((await personaRoute.DELETE(as(bruno, "/api/personas/moderno", "DELETE"), params("moderno"))).status).toBe(403);
    // The built-in persona can't be deleted even by an admin.
    expect((await personaRoute.DELETE(as(ana, "/api/personas/moderno", "DELETE"), params("moderno"))).status).toBe(409);
  });
});
