import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { ChatBusyError } from "./errors";
import { STEP_DISMISSED_OUTPUT } from "./messages";
import type { NewToolStep } from "./toolSteps";
import { createChatRepository, type ChatRepository } from "./repository";
import { MAX_CHAT_TITLE_CHARS, titleFromMessage } from "./schema";

const SOURCES = [{ ref: "F1", title: "Lei Complementar 7", label: "Art. 5º" }];

describe("createChatRepository", () => {
  let chats: ChatRepository;
  let id: string;
  let owner: string;
  let other: string;

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    owner = insertTestUser(db, "ana");
    other = insertTestUser(db, "bruno");
    chats = createChatRepository(db);
    id = chats.createConversation({ ownerId: owner, title: "Multa contratual", minutaId: null, useLibrary: true, useJurisprudencia: true });
  });

  const READ_STEP = {
    tool: "buscar_biblioteca",
    kind: "read",
    input: { consulta: "multa" },
    summary: "Busquei “multa”",
    status: "done",
    output: null,
    card: null,
  } satisfies NewToolStep;
  const ACTION_STEP = {
    tool: "criar_clausula",
    kind: "action",
    input: { input: { titulo: "Multa" }, state: null },
    summary: "Criar “Multa”",
    status: "awaiting_confirmation",
    output: null,
    card: { type: "fields", title: "Multa", rows: [{ label: "Texto", value: "Dez por cento." }] },
  } satisfies NewToolStep;

  it("saves the reply's steps in order and keeps their input on the server", () => {
    const { replyId } = chats.addExchange(id, "Crie a cláusula");
    chats.completeReply(replyId, "Preparei.", [], [READ_STEP, ACTION_STEP]);

    const [first, second] = chats.get(id, owner)!.messages[1].steps;
    expect(first).toMatchObject({ tool: "buscar_biblioteca", kind: "read", status: "done", summary: "Busquei “multa”" });
    expect(first).not.toHaveProperty("input");
    expect(second).toMatchObject({ kind: "action", status: "awaiting_confirmation", card: ACTION_STEP.card });
    expect(chats.getStep(id, second.id)).toMatchObject({ messageId: replyId, input: ACTION_STEP.input });
    expect(chats.getStep("another-conversation", second.id)).toBeNull();
  });

  it("decides a waiting action once and records its outcome", () => {
    const { replyId } = chats.addExchange(id, "Crie a cláusula");
    chats.completeReply(replyId, "Preparei.", [], [ACTION_STEP]);
    const stepId = chats.get(id, owner)!.messages[1].steps[0].id;

    expect(chats.claimStep(stepId, "confirmed")).toBe(true);
    expect(chats.claimStep(stepId, "rejected")).toBe(false);
    chats.recordStepOutcome(stepId, { status: "confirmed", output: "Criada.", card: { type: "link", href: "/clausulas/1", label: "Abrir" } });
    expect(chats.getStep(id, stepId)).toMatchObject({ status: "confirmed", output: "Criada.", card: { type: "link" } });

    const { replyId: followUp } = chats.addContinuation(id);
    expect(chats.get(id, owner)!.messages.at(-1)).toMatchObject({ id: followUp, role: "assistant", status: "pending" });
    expect(() => chats.addContinuation(id)).toThrow(ChatBusyError);
  });

  it("dismisses a waiting action when the user moves on with a new question", () => {
    const { replyId } = chats.addExchange(id, "Crie a cláusula");
    chats.completeReply(replyId, "Preparei.", [], [ACTION_STEP]);
    chats.addExchange(id, "Deixa para lá, outra pergunta");

    const step = chats.get(id, owner)!.messages[1].steps[0];
    expect(step).toMatchObject({ status: "rejected", output: STEP_DISMISSED_OUTPUT });
  });

  it("adds a question with a pending reply and fills it once, with its sources", () => {
    const { replyId } = chats.addExchange(id, "Qual a multa máxima?");
    chats.attachTask(replyId, "task-1");
    expect(chats.get(id, owner)).toMatchObject({
      isReplying: true,
      messages: [
        { role: "user", content: "Qual a multa máxima?", status: "done" },
        { role: "assistant", content: "", status: "pending", taskId: "task-1" },
      ],
    });

    expect(chats.completeReply(replyId, "Até 2% [F1].", SOURCES)).toBe(true);
    expect(chats.completeReply(replyId, "de novo", [])).toBe(false);
    const conversation = chats.get(id, owner)!;
    expect(conversation.isReplying).toBe(false);
    expect(conversation.messages[1]).toMatchObject({ content: "Até 2% [F1].", status: "done", sources: SOURCES });
    expect(chats.list(owner)[0]).toMatchObject({ id, preview: "Até 2% [F1]." });
  });

  it("takes one question at a time", () => {
    chats.addExchange(id, "Primeira");
    expect(() => chats.addExchange(id, "Segunda")).toThrow(ChatBusyError);
  });

  it("retries only a failed reply, and not while another one is pending", () => {
    const { replyId } = chats.addExchange(id, "Pergunta");
    expect(() => chats.retryReply(id, replyId)).toThrow(ChatBusyError);
    expect(chats.failReply(replyId, "Serviço indisponível")).toBe(true);
    expect(chats.get(id, owner)!.messages[1]).toMatchObject({ status: "failed", error: "Serviço indisponível" });

    expect(chats.retryReply(id, replyId)).toBe(true);
    expect(chats.get(id, owner)!.messages[1]).toMatchObject({ status: "pending", error: null });
    expect(() => chats.retryReply(id, replyId)).toThrow(ChatBusyError);
  });

  it("renames, toggles the library and jurisprudence searches, and deletes with the messages", () => {
    chats.addExchange(id, "Pergunta");
    expect(chats.rename(id, owner, "Novo título")).toBe(true);
    expect(chats.setUseLibrary(id, owner, false)).toBe(true);
    expect(chats.setUseJurisprudencia(id, owner, false)).toBe(true);
    expect(chats.get(id, owner)).toMatchObject({ title: "Novo título", useLibrary: false, useJurisprudencia: false });
    expect(chats.delete(id, owner)).toBe(true);
    expect(chats.get(id, owner)).toBeNull();
    expect(chats.list(owner)).toEqual([]);
  });

  it("keeps each user's conversations private", () => {
    expect(chats.list(other)).toEqual([]);
    expect(chats.get(id, other)).toBeNull();
    expect(chats.rename(id, other, "Invasão")).toBe(false);
    expect(chats.delete(id, other)).toBe(false);
    expect(chats.get(id, owner)?.title).toBe("Multa contratual");
  });

  it("names a conversation after its first question, cut at a word", () => {
    expect(titleFromMessage("  Qual   a multa?\n")).toBe("Qual a multa?");
    const long = titleFromMessage("palavra ".repeat(40));
    expect(long.length).toBeLessThanOrEqual(MAX_CHAT_TITLE_CHARS);
    expect(long.endsWith("palavra…")).toBe(true);
  });
});
