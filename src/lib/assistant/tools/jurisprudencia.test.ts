import { describe, expect, it, vi } from "vitest";
import type { JurisprudenciasCaller } from "@/lib/integrations/jurisprudencias/caller";
import { createCitationRegistry } from "../citations";
import type { AssistantTool, ToolContext } from "../tool";
import { createJurisprudenciaTools, numberDecisions } from "./jurisprudencia";

function context(): ToolContext {
  return { ownerId: "u1", conversationId: "c1", signal: new AbortController().signal, citations: createCitationRegistry() };
}

function tools(answer: string) {
  const call = vi.fn<JurisprudenciasCaller>().mockResolvedValue(answer);
  const [search, lookup, courts] = createJurisprudenciaTools({ call }) as (AssistantTool & { kind: "read" })[];
  return { call, search, lookup, courts };
}

describe("pesquisar_jurisprudencia", () => {
  it("sends the service's arguments and numbers each decision of a JSON answer", async () => {
    const answer = JSON.stringify({
      total: 2,
      decisions: [
        { court: "STJ", process_number: "REsp 1.000/SP", publication_date: "2025-03-01", ementa: "Fiança…" },
        { court: "STJ", process_number: "REsp 2.000/RJ", ementa: "Multa…" },
      ],
    });
    const { call, search } = tools(answer);
    const ctx = context();
    const input = search.input.parse({
      tribunal: "stj",
      consulta: "fiança locação",
      ordenarPor: "julgamento",
      publicadoDe: "2025-01-01",
    });

    const outcome = await search.run(input, ctx);

    expect(call).toHaveBeenCalledWith(
      "search_decisions",
      { court: "stj", query: "fiança locação", page: 0, sort_by: "trial_date", pub_from: "2025-01-01" },
      { signal: ctx.signal },
    );
    expect(outcome.output).toContain("Nunca mostre identificadores");
    expect(outcome.output).toContain('"ref": "J1"');
    expect(outcome.output).toContain('"ref": "J2"');
    expect(ctx.citations.consulted()).toEqual([
      { ref: "J1", title: "STJ REsp 1.000/SP", label: "2025-03-01" },
      { ref: "J2", title: "STJ REsp 2.000/RJ", label: "Ementa" },
    ]);
    expect(outcome.summary).toBe("Pesquisei jurisprudência no STJ: “fiança locação”");
  });

  it("maps a structured intent and requires a query or an intent", async () => {
    const { call, search } = tools("sem resultados");
    const intent = { obrigatorios: ["fiança"], qualquerUm: ["locação", "aluguel"], excluir: ["comercial"] };
    await search.run(search.input.parse({ tribunal: "tjsp", intencao: intent }), context());
    expect(call.mock.calls[0][1]).toMatchObject({
      court: "tjsp",
      query_intent: { required: ["fiança"], any_of: ["locação", "aluguel"], phrases: [], exclude: ["comercial"] },
    });
    expect(call.mock.calls[0][1]).not.toHaveProperty("query");
    expect(search.input.safeParse({ tribunal: "stj" }).success).toBe(false);
    expect(search.input.safeParse({ tribunal: "xyz", consulta: "a" }).success).toBe(false);
    expect(search.input.safeParse({ tribunal: "stj", consulta: "a", publicadoDe: "01/02/2025" }).success).toBe(false);
  });
});

describe("other tools", () => {
  it("references a looked-up decision by court and number", async () => {
    const { call, lookup } = tools("EMENTA: …");
    const ctx = context();
    const outcome = await lookup.run(lookup.input.parse({ tribunal: "stf", processo: "ADI 1234" }), ctx);
    expect(call).toHaveBeenCalledWith("lookup_decision", { court: "stf", process_number: "ADI 1234" }, { signal: ctx.signal });
    expect(outcome.output).toContain("[J1] EMENTA: …");
    expect(ctx.citations.consulted()).toEqual([{ ref: "J1", title: "STF ADI 1234", label: "Ementa" }]);
  });

  it("passes the court list through", async () => {
    const { courts } = tools('[{"id":"stj"}]');
    await expect(courts.run({}, context())).resolves.toMatchObject({ output: '[{"id":"stj"}]' });
  });
});

describe("numberDecisions", () => {
  it("falls back to one reference for an answer that is not a list of decisions", () => {
    const citations = createCitationRegistry();
    expect(numberDecisions("texto livre", citations, { title: "TJSP — pesquisa", label: "“x”" })).toBe("[J1] texto livre");
    expect(numberDecisions("[1,2]", citations, { title: "TJSP — pesquisa", label: "“x”" })).toBe("[J1] [1,2]");
  });

  it("numbers a bare JSON list", () => {
    const citations = createCitationRegistry();
    const out = numberDecisions('[{"tribunal":"TJSP","numero":"123"}]', citations, { title: "t", label: "l" });
    expect(JSON.parse(out)).toEqual([{ ref: "J1", tribunal: "TJSP", numero: "123" }]);
  });
});
