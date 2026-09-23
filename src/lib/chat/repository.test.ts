import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { ChatBusyError } from "./errors";
import { createChatRepository, type ChatRepository } from "./repository";
import { MAX_CHAT_TITLE_CHARS, titleFromMessage } from "./schema";

const SOURCES = [{ ref: "F1", title: "Lei Complementar 7", label: "Art. 5º" }];

describe("createChatRepository", () => {
  let chats: ChatRepository;
  let id: string;

  beforeEach(() => {
    chats = createChatRepository(openDatabase(IN_MEMORY_DATABASE));
    id = chats.createConversation({ title: "Multa contratual", minutaId: null, useLibrary: true });
  });

  it("adds a question with a pending reply and fills it once, with its sources", () => {
    const { replyId } = chats.addExchange(id, "Qual a multa máxima?");
    chats.attachTask(replyId, "task-1");
    expect(chats.get(id)).toMatchObject({
      isReplying: true,
      messages: [
        { role: "user", content: "Qual a multa máxima?", status: "done" },
        { role: "assistant", content: "", status: "pending", taskId: "task-1" },
      ],
    });

    expect(chats.completeReply(replyId, "Até 2% [F1].", SOURCES)).toBe(true);
    expect(chats.completeReply(replyId, "de novo", [])).toBe(false);
    const conversation = chats.get(id)!;
    expect(conversation.isReplying).toBe(false);
    expect(conversation.messages[1]).toMatchObject({ content: "Até 2% [F1].", status: "done", sources: SOURCES });
    expect(chats.list()[0]).toMatchObject({ id, preview: "Até 2% [F1]." });
  });

  it("takes one question at a time", () => {
    chats.addExchange(id, "Primeira");
    expect(() => chats.addExchange(id, "Segunda")).toThrow(ChatBusyError);
  });

  it("retries only a failed reply, and not while another one is pending", () => {
    const { replyId } = chats.addExchange(id, "Pergunta");
    expect(() => chats.retryReply(id, replyId)).toThrow(ChatBusyError);
    expect(chats.failReply(replyId, "Serviço indisponível")).toBe(true);
    expect(chats.get(id)!.messages[1]).toMatchObject({ status: "failed", error: "Serviço indisponível" });

    expect(chats.retryReply(id, replyId)).toBe(true);
    expect(chats.get(id)!.messages[1]).toMatchObject({ status: "pending", error: null });
    expect(() => chats.retryReply(id, replyId)).toThrow(ChatBusyError);
  });

  it("renames, toggles the library and deletes with the messages", () => {
    chats.addExchange(id, "Pergunta");
    expect(chats.rename(id, "Novo título")).toBe(true);
    expect(chats.setUseLibrary(id, false)).toBe(true);
    expect(chats.get(id)).toMatchObject({ title: "Novo título", useLibrary: false });
    expect(chats.delete(id)).toBe(true);
    expect(chats.get(id)).toBeNull();
    expect(chats.list()).toEqual([]);
  });

  it("names a conversation after its first question, cut at a word", () => {
    expect(titleFromMessage("  Qual   a multa?\n")).toBe("Qual a multa?");
    const long = titleFromMessage("palavra ".repeat(40));
    expect(long.length).toBeLessThanOrEqual(MAX_CHAT_TITLE_CHARS);
    expect(long.endsWith("palavra…")).toBe(true);
  });
});
