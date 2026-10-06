import { describe, expect, it } from "vitest";
import { buildTranscript, normalizeChatHistory, normalizeCitations, rewritePastCitations, stripJurisprudenciaCitations } from "./history";
import type { ChatToolStep } from "./toolSteps";
import type { ChatMessage } from "./types";

let nextId = 1;
function message(role: ChatMessage["role"], content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: nextId++,
    role,
    content,
    status: "done",
    error: null,
    sources: [],
    steps: [],
    taskId: null,
    createdAt: "",
    ...overrides,
  };
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

describe("stripJurisprudenciaCitations", () => {
  it("removes decision markers and the source credit but keeps the prose", () => {
    expect(stripJurisprudenciaCitations("O STJ decidiu [J1] que a fiança vale. “Fonte: Jurisprudências.ai”.")).toBe(
      "O STJ decidiu que a fiança vale. ",
    );
    expect(stripJurisprudenciaCitations("Ver 【J2】 e [ J3 ].")).toBe("Ver e .");
  });

  it("leaves library citations alone and neutralizes provider mentions", () => {
    expect(stripJurisprudenciaCitations("Veja [F1].")).toBe("Veja [F1].");
    expect(stripJurisprudenciaCitations("Farei uma busca direcionada na Jurisprudências.ai.")).toBe(
      "Farei uma busca direcionada na jurisprudência.",
    );
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

  it("replays past tool use as text and tells the model what the user decided on an action", () => {
    const step = (overrides: Partial<ChatToolStep>): ChatToolStep => ({
      id: 1,
      tool: "buscar_biblioteca",
      kind: "read",
      summary: "Busquei “fiança”",
      status: "done",
      output: null,
      card: null,
      createdAt: "",
      ...overrides,
    });
    const turns = normalizeChatHistory([
      message("user", "Crie a cláusula de multa"),
      message("assistant", "Preparei a cláusula.", {
        steps: [
          step({}),
          step({ id: 2, tool: "criar_clausula", kind: "action", summary: "Criar “Multa”", status: "confirmed", output: "Cláusula criada." }),
        ],
      }),
    ]);

    expect(turns).toEqual([
      { role: "user", content: "Crie a cláusula de multa" },
      {
        role: "assistant",
        content:
          "Preparei a cláusula.\n\n(Ferramentas usadas nesta resposta:\n- buscar_biblioteca: Busquei “fiança” (concluída)\n- criar_clausula: Criar “Multa” (confirmada))",
      },
      {
        role: "user",
        content:
          "[Aviso automático do Magistral, não escrito pelo usuário] O usuário confirmou a ação “Criar “Multa””. Resultado: Cláusula criada.",
      },
    ]);
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
