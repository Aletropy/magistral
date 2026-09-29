import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/errors/AppError";
import type { AgentPrompt, AgentStepResult, ToolCall, ToolChatGenerator } from "@/lib/llm/tools/types";
import { NO_USAGE } from "@/lib/llm/types";
import { createCitationRegistry } from "./citations";
import {
  DEFAULT_CONFIRMATION_TEXT,
  STEP_LIMIT_NOTE,
  TOOL_RESULT_MAX_CHARS,
  runAgent,
  type AgentRun,
} from "./runAgent";
import { defineActionTool, defineReadTool, type ToolContext } from "./tool";

function step(text: string, toolCalls: ToolCall[] = []): AgentStepResult {
  return { text, toolCalls, model: "fake", usage: NO_USAGE };
}

/** A model that answers from a script, recording every prompt it saw. */
function scripted(...results: AgentStepResult[]) {
  const prompts: AgentPrompt[] = [];
  const generator = vi.fn<ToolChatGenerator>(async (prompt) => {
    prompts.push(structuredClone(prompt));
    const next = results.shift();
    if (!next) throw new Error("script ended");
    return next;
  });
  return { generator, prompts };
}

const search = defineReadTool({
  name: "buscar",
  description: "Busca.",
  input: z.object({ consulta: z.string().min(1) }),
  progressLabel: "Buscando",
  run: async ({ consulta }) => ({ output: `Achei sobre ${consulta}`, summary: `Busquei “${consulta}”` }),
});

const execute = vi.fn();
const createClause = defineActionTool({
  name: "criar",
  description: "Cria.",
  input: z.object({ titulo: z.string() }),
  progressLabel: "Preparando",
  propose: async ({ titulo }) => {
    if (titulo === "repetida") throw new AppError(409, "Já existe uma cláusula com este título.");
    return { summary: `Criar “${titulo}”`, card: { type: "fields", title: titulo, rows: [] }, state: { v: 1 } };
  },
  execute,
});

function context(): ToolContext {
  return { ownerId: "u1", conversationId: "c1", signal: new AbortController().signal, citations: createCitationRegistry() };
}

function agent(generator: ToolChatGenerator, overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    generator,
    system: "sistema",
    history: [{ role: "user", content: "pergunta" }],
    tools: [search, createClause],
    temperature: 0.3,
    context: context(),
    ...overrides,
  };
}

const call = (name: string, args: unknown, id = `${name}-1`): ToolCall => ({ id, name, arguments: args });

describe("runAgent", () => {
  it("answers directly when the model needs no tool", async () => {
    const { generator, prompts } = scripted(step("Resposta."));
    await expect(runAgent(agent(generator))).resolves.toEqual({ text: "Resposta.", steps: [], awaitingConfirmation: false });
    expect(prompts[0].tools.map((tool) => tool.name)).toEqual(["buscar", "criar"]);
    expect(prompts[0].tools[0].parameters).toMatchObject({ type: "object", required: ["consulta"] });
  });

  it("runs reading tools, wraps their results as data and records the steps", async () => {
    const { generator, prompts } = scripted(step("", [call("buscar", { consulta: "fiança" })]), step("Segundo [F1]."));
    const onProgress = vi.fn();

    const result = await runAgent(agent(generator, { onProgress }));

    expect(result.text).toBe("Segundo [F1].");
    expect(result.steps).toEqual([
      { tool: "buscar", kind: "read", input: { consulta: "fiança" }, summary: "Busquei “fiança”", status: "done", output: null, card: null },
    ]);
    expect(onProgress).toHaveBeenCalledWith("Buscando");
    expect(prompts[1].messages.at(-1)).toEqual({
      role: "tool",
      toolCallId: "buscar-1",
      name: "buscar",
      content: '<resultado_ferramenta ferramenta="buscar">\nAchei sobre fiança\n</resultado_ferramenta>',
    });
  });

  it("tells the model about invalid input and unknown tools so it can correct itself", async () => {
    const { generator, prompts } = scripted(
      step("", [call("buscar", { consulta: "" }), call("apagar_tudo", {})]),
      step("Ok."),
    );
    const result = await runAgent(agent(generator));

    expect(result.steps).toEqual([]);
    const [invalid, unknown] = prompts[1].messages.slice(-2);
    expect(invalid).toMatchObject({ role: "tool", content: expect.stringContaining("Pedido inválido") });
    expect(unknown).toMatchObject({ role: "tool", content: expect.stringContaining("Ferramenta desconhecida") });
  });

  it("cuts long results", async () => {
    const long = defineReadTool({ ...search, name: "longa", run: async () => ({ output: "x".repeat(TOOL_RESULT_MAX_CHARS * 2), summary: "…" }) });
    const { generator, prompts } = scripted(step("", [call("longa", { consulta: "a" })]), step("Ok."));
    await runAgent(agent(generator, { tools: [long] }));
    const content = (prompts[1].messages.at(-1) as { content: string }).content;
    expect(content.length).toBeLessThan(TOOL_RESULT_MAX_CHARS + 200);
    expect(content).toContain("resultado cortado");
  });

  it("stops at an action and saves it waiting for confirmation, without running it", async () => {
    const { generator } = scripted(step("", [call("buscar", { consulta: "multa" }), call("criar", { titulo: "Multa" })]));

    const result = await runAgent(agent(generator));

    expect(generator).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ text: DEFAULT_CONFIRMATION_TEXT, awaitingConfirmation: true });
    expect(result.steps.map((saved) => saved.status)).toEqual(["done", "awaiting_confirmation"]);
    expect(result.steps[1]).toMatchObject({
      tool: "criar",
      kind: "action",
      input: { input: { titulo: "Multa" }, state: { v: 1 } },
      summary: "Criar “Multa”",
    });
  });

  it("reports a proposal the app refused back to the model, which carries on", async () => {
    const { generator, prompts } = scripted(step("", [call("criar", { titulo: "repetida" })]), step("Essa já existe."));
    const result = await runAgent(agent(generator));

    expect(result).toEqual({ text: "Essa já existe.", steps: [], awaitingConfirmation: false });
    expect(prompts[1].messages.at(-1)).toMatchObject({ content: "Já existe uma cláusula com este título." });
  });

  it("forces an answer once the step limit is reached", async () => {
    const searching = () => step("", [call("buscar", { consulta: "a" })]);
    const { generator, prompts } = scripted(searching(), searching(), step("Final.", [call("buscar", { consulta: "a" })]));

    const result = await runAgent(agent(generator, { maxSteps: 2 }));

    expect(result.text).toBe("Final.");
    expect(result.steps).toHaveLength(2);
    expect(prompts[2].messages.at(-1)).toEqual({ role: "user", content: STEP_LIMIT_NOTE });
  });

  it("stops when the reply is cancelled", async () => {
    const controller = new AbortController();
    const { generator } = scripted(step("", [call("buscar", { consulta: "a" })]));
    const run = agent(generator, { context: { ...context(), signal: controller.signal } });
    controller.abort();
    await expect(runAgent(run)).rejects.toThrow();
  });
});

describe("createCitationRegistry", () => {
  it("numbers excerpts across searches and keeps the number of one seen before", () => {
    const citations = createCitationRegistry();
    const excerpt = (text: string) => ({ title: "Lei 8.245", label: "Art. 37", context: "", text });
    expect(citations.add([excerpt("a"), excerpt("b")]).map((source) => source.ref)).toEqual(["F1", "F2"]);
    expect(citations.add([excerpt("b"), excerpt("c")]).map((source) => source.ref)).toEqual(["F2", "F3"]);
    expect(citations.consulted()).toHaveLength(3);
  });
});
