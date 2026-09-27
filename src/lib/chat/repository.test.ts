import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { ChatBusyError } from "./errors";
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
    id = chats.createConversation({ ownerId: owner, title: "Multa contratual", minutaId: null, useLibrary: true });
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

  it("renames, toggles the library and deletes with the messages", () => {
    chats.addExchange(id, "Pergunta");
    expect(chats.rename(id, owner, "Novo título")).toBe(true);
    expect(chats.setUseLibrary(id, owner, false)).toBe(true);
    expect(chats.get(id, owner)).toMatchObject({ title: "Novo título", useLibrary: false });
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
