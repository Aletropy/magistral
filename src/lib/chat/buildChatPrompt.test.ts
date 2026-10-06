import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt, toAgentHistory, type ChatPromptContext } from "./buildChatPrompt";

const CONTEXT: ChatPromptContext = {
  appData: {
    personas: [{ name: "Moderno / Startup", description: "Linguagem clara." }],
    clauses: [{ title: "Foro", category: "Geral" }],
    librarySources: [{ title: "Lei Complementar 7", kind: "Lei" }],
  },
  library: "on",
  jurisprudencia: "unavailable",
  minuta: null,
};

describe("buildChatSystemPrompt", () => {
  it("includes the tool rules, the app guide and the user's personas, clauses and library titles", () => {
    const prompt = buildChatSystemPrompt(CONTEXT);
    expect(prompt).toContain("preparar_minuta");
    expect(prompt).toContain("<resultado_ferramenta>");
    expect(prompt).toContain("/biblioteca");
    expect(prompt).toContain("- Moderno / Startup: Linguagem clara.");
    expect(prompt).toContain("- Foro (Geral)");
    expect(prompt).toContain("- Lei Complementar 7 (Lei)");
  });

  it("asks for library searches and citations only when the library is on", () => {
    expect(buildChatSystemPrompt(CONTEXT)).toContain("buscar_biblioteca");
    expect(buildChatSystemPrompt(CONTEXT)).toContain("[F1]");
    expect(buildChatSystemPrompt({ ...CONTEXT, library: "empty" })).toContain("está vazia");
    expect(buildChatSystemPrompt({ ...CONTEXT, library: "off" })).toContain("está desligada");
    expect(buildChatSystemPrompt({ ...CONTEXT, library: "off" })).not.toContain("buscar_biblioteca");
  });

  it("offers attributed jurisprudence rules only while the switch is on", () => {
    const on = buildChatSystemPrompt({ ...CONTEXT, jurisprudencia: "on" });
    expect(on).toContain("## Jurisprudência");
    expect(on).toContain("pesquisar_jurisprudencia");
    expect(on).toContain("Fonte: Jurisprudências.ai");
    expect(on).toContain("Fontes consultadas");
    expect(on).not.toContain("parecer escrita só com o seu conhecimento");
    expect(buildChatSystemPrompt({ ...CONTEXT, jurisprudencia: "off" })).toContain("está desligada");
    expect(buildChatSystemPrompt(CONTEXT)).toContain("não está conectada");
  });

  it("tells where the user is only when the panel sent a page", () => {
    const prompt = buildChatSystemPrompt({ ...CONTEXT, pageContext: "O usuário está na página “Histórico”." });
    expect(prompt).toContain("<contexto_da_pagina>\nO usuário está na página “Histórico”.\n</contexto_da_pagina>");
    expect(buildChatSystemPrompt(CONTEXT)).not.toContain("## Onde o usuário está");
  });

  it("carries the minuta under discussion in its own block", () => {
    const prompt = buildChatSystemPrompt({ ...CONTEXT, minuta: { title: 'NDA "Beta"', markdown: "# NDA" } });
    expect(prompt).toContain(`<minuta titulo="NDA 'Beta'">\n# NDA\n</minuta>`);
  });
});

describe("toAgentHistory", () => {
  it("keeps the turns as plain messages without tool calls", () => {
    expect(
      toAgentHistory([
        { role: "user", content: "Q1" },
        { role: "assistant", content: "A1" },
      ]),
    ).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1", toolCalls: [] },
    ]);
  });
});
