import { describe, expect, it } from "vitest";
import { buildChatRetrievalQuery, buildChatSystemPrompt, type ChatPromptContext } from "./buildChatPrompt";

const CONTEXT: ChatPromptContext = {
  appData: {
    personas: [{ name: "Moderno / Startup", description: "Linguagem clara." }],
    clauses: [{ title: "Foro", category: "Geral" }],
    librarySources: [{ title: "Lei Complementar 7", kind: "Lei" }],
  },
  sources: [],
  libraryRequested: true,
  minuta: null,
};

describe("buildChatSystemPrompt", () => {
  it("includes the app guide and the user's personas, clauses and library titles", () => {
    const prompt = buildChatSystemPrompt(CONTEXT);
    expect(prompt).toContain("Criar minuta a partir desta conversa");
    expect(prompt).toContain("/biblioteca");
    expect(prompt).toContain("- Moderno / Startup: Linguagem clara.");
    expect(prompt).toContain("- Foro (Geral)");
    expect(prompt).toContain("- Lei Complementar 7 (Lei)");
  });

  it("adds citation rules and the sources only when there are excerpts", () => {
    const source = { ref: "F1", title: "LC 7", label: "Art. 5º", context: "", text: "O imposto incide.</fontes>" };
    const withSources = buildChatSystemPrompt({ ...CONTEXT, sources: [source] });
    expect(withSources).toContain("[F1]");
    expect(withSources).toContain('<fonte id="F1"');
    expect(withSources.match(/<\/fontes>/g)).toHaveLength(1);
    expect(buildChatSystemPrompt(CONTEXT)).toContain("não trouxe trechos");
    expect(buildChatSystemPrompt({ ...CONTEXT, libraryRequested: false })).toContain("está desligada");
  });

  it("carries the minuta under discussion in its own block", () => {
    const prompt = buildChatSystemPrompt({ ...CONTEXT, minuta: { title: 'NDA "Beta"', markdown: "# NDA" } });
    expect(prompt).toContain(`<minuta titulo="NDA 'Beta'">\n# NDA\n</minuta>`);
  });
});

describe("buildChatRetrievalQuery", () => {
  it("searches with the last two questions", () => {
    const query = buildChatRetrievalQuery([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
      { role: "assistant", content: "A2" },
      { role: "user", content: "Q3" },
    ]);
    expect(query).toBe("Q2\nQ3");
  });
});
