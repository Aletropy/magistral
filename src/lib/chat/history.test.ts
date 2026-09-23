import { describe, expect, it } from "vitest";
import { buildTranscript, normalizeChatHistory, normalizeCitations, rewritePastCitations } from "./history";
import type { ChatMessage } from "./types";

let nextId = 1;
function message(role: ChatMessage["role"], content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: nextId++, role, content, status: "done", error: null, sources: [], taskId: null, createdAt: "", ...overrides };
}

describe("normalizeCitations", () => {
  it("turns other bracket styles into [Fn]", () => {
    expect(normalizeCitations("Art. 24【F1】【F3】, ver ［F2］ e [ F4 ].")).toBe("Art. 24[F1][F3], ver [F2] e [F4].");
  });
});

describe("rewritePastCitations", () => {
  it("spells out old [Fn] citations with the source they pointed to", () => {
    const sources = [{ ref: "F1", title: "LC 7/1973", label: "Art. 5º" }];
    expect(rewritePastCitations({ content: "Veja [F1] e [F2].", sources })).toBe("Veja [LC 7/1973, Art. 5º] e [F2].");
  });
});

describe("normalizeChatHistory", () => {
  it("drops unfinished replies, merges consecutive user turns and ends on the user's question", () => {
    const turns = normalizeChatHistory([
      message("assistant", "Olá! Como posso ajudar?"),
      message("user", "Primeira pergunta"),
      message("assistant", "", { status: "failed", error: "falhou" }),
      message("user", "Segunda pergunta"),
      message("assistant", "", { status: "pending" }),
    ]);
    expect(turns).toEqual([{ role: "user", content: "Primeira pergunta\n\nSegunda pergunta" }]);
  });

  it("drops the oldest turns past the budget, still starting with a user turn", () => {
    const turns = normalizeChatHistory(
      [message("user", "a".repeat(50)), message("assistant", "b".repeat(50)), message("user", "c".repeat(10))],
      70,
    );
    expect(turns).toEqual([{ role: "user", content: "c".repeat(10) }]);
  });
});

describe("buildTranscript", () => {
  it("labels each speaker and keeps the whole finished conversation", () => {
    const transcript = buildTranscript([message("user", "Quero um NDA"), message("assistant", "Com quem?")]);
    expect(transcript).toBe("Usuário: Quero um NDA\n\nAdvogado IA: Com quem?");
  });
});
