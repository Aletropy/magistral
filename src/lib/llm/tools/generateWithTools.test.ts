import type Anthropic from "@anthropic-ai/sdk";
import { FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { createAnthropicToolGenerator } from "../anthropic/generateWithTools";
import { createGeminiToolGenerator } from "../gemini/generateWithTools";
import type { ChatCompletion, OpenRouterClient } from "../openrouter/api";
import { PRIVATE_ROUTING } from "../openrouter/config";
import { createOpenRouterToolGenerator } from "../openrouter/generateWithTools";
import type { AgentPrompt, ToolDefinition } from "./types";

const TOOL: ToolDefinition = {
  name: "buscar_biblioteca",
  description: "Busca trechos na biblioteca.",
  parameters: { type: "object", properties: { consulta: { type: "string" } }, required: ["consulta"] },
};

/** A reply mid-loop: the question, one call and its result. */
const PROMPT: AgentPrompt = {
  system: "Você é o Advogado IA.",
  temperature: 0.2,
  tools: [TOOL],
  messages: [
    { role: "user", content: "O que diz a lei do inquilinato sobre fiança?" },
    { role: "assistant", content: "", toolCalls: [{ id: "c1", name: "buscar_biblioteca", arguments: { consulta: "fiança" } }] },
    { role: "tool", toolCallId: "c1", name: "buscar_biblioteca", content: "[F1] Art. 37…" },
  ],
};

describe("createOpenRouterToolGenerator", () => {
  function fakeClient(message: ChatCompletion["choices"][number]["message"]) {
    const completion: ChatCompletion = {
      model: "q/model:free",
      choices: [{ finish_reason: "tool_calls", message }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    };
    const chat = vi.fn<OpenRouterClient["chat"]>().mockResolvedValue(completion);
    return { client: { chat }, chat };
  }

  it("sends OpenAI-style tools and history, routed to endpoints that support them", async () => {
    const { client, chat } = fakeClient({
      content: null,
      tool_calls: [{ id: "c2", type: "function", function: { name: "buscar_biblioteca", arguments: '{"consulta":"caução"}' } }],
    });

    const result = await createOpenRouterToolGenerator(client, ["q/model:free"])(PROMPT);

    expect(result.toolCalls).toEqual([{ id: "c2", name: "buscar_biblioteca", arguments: { consulta: "caução" } }]);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20, thinkingTokens: 0 });
    const [request] = chat.mock.calls[0];
    expect(request.provider).toEqual({ ...PRIVATE_ROUTING, require_parameters: true });
    expect(request.tools).toEqual([{ type: "function", function: TOOL_AS_FUNCTION }]);
    expect(request.messages.slice(2)).toEqual([
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "buscar_biblioteca", arguments: '{"consulta":"fiança"}' } }],
      },
      { role: "tool", tool_call_id: "c1", content: "[F1] Art. 37…" },
    ]);
  });

  it("keeps malformed arguments as text and sends no tools for the final answer", async () => {
    const { client, chat } = fakeClient({
      content: "Resposta",
      tool_calls: [{ id: "c3", type: "function", function: { name: "x", arguments: "{quebrado" } }],
    });
    const result = await createOpenRouterToolGenerator(client, ["q/model:free"])({ ...PROMPT, tools: [] });

    expect(result.toolCalls[0].arguments).toBe("{quebrado");
    expect(chat.mock.calls[0][0]).not.toHaveProperty("tools");
    expect(chat.mock.calls[0][0].provider).toEqual(PRIVATE_ROUTING);
  });
});

const TOOL_AS_FUNCTION = { name: TOOL.name, description: TOOL.description, parameters: TOOL.parameters };

describe("createGeminiToolGenerator", () => {
  function fakeClient(parts: object[]) {
    const generateContent = vi.fn<(request: unknown) => Promise<object>>().mockResolvedValue({
      candidates: [{ finishReason: FinishReason.STOP, content: { role: "model", parts } }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 },
    });
    return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
  }

  it("declares the functions, replays calls and groups their responses in one user turn", async () => {
    const { client, generateContent } = fakeClient([
      { text: "pensando", thought: true },
      { text: "Vou buscar." },
      { functionCall: { name: "buscar_biblioteca", args: { consulta: "multa" } } },
    ]);

    const result = await createGeminiToolGenerator(client)(PROMPT);

    expect(result.text).toBe("Vou buscar.");
    expect(result.toolCalls).toEqual([
      { id: expect.stringMatching(/^local-/), name: "buscar_biblioteca", arguments: { consulta: "multa" } },
    ]);
    expect(result.providerContent).toMatchObject({ role: "model" });
    const request = generateContent.mock.calls[0][0] as { contents: unknown[]; config: { tools: unknown } };
    expect(request.config.tools).toEqual([
      { functionDeclarations: [{ name: TOOL.name, description: TOOL.description, parametersJsonSchema: TOOL.parameters }] },
    ]);
    expect(request.contents.slice(1)).toEqual([
      { role: "model", parts: [{ functionCall: { id: "c1", name: "buscar_biblioteca", args: { consulta: "fiança" } } }] },
      {
        role: "user",
        parts: [{ functionResponse: { id: "c1", name: "buscar_biblioteca", response: { output: "[F1] Art. 37…" } } }],
      },
    ]);
  });

  it("sends back the model's own content and omits ids Gemini never gave", async () => {
    const { client, generateContent } = fakeClient([{ text: "Pronto." }]);
    const signed = { role: "model", parts: [{ functionCall: { name: "x", args: {} }, thoughtSignature: "sig" }] };

    await createGeminiToolGenerator(client)({
      ...PROMPT,
      messages: [
        PROMPT.messages[0],
        { role: "assistant", content: "", toolCalls: [{ id: "local-1", name: "x", arguments: {} }], providerContent: signed },
        { role: "tool", toolCallId: "local-1", name: "x", content: "ok" },
      ],
    });

    const request = generateContent.mock.calls[0][0] as { contents: unknown[] };
    expect(request.contents.slice(1)).toEqual([
      signed,
      { role: "user", parts: [{ functionResponse: { name: "x", response: { output: "ok" } } }] },
    ]);
  });
});

describe("createAnthropicToolGenerator", () => {
  function fakeClient(content: object[]) {
    const message = { stop_reason: "tool_use", content, model: "claude-opus-5", usage: { input_tokens: 70, output_tokens: 30 } };
    const stream = vi
      .fn<(request: unknown, options: unknown) => { finalMessage: () => Promise<typeof message> }>()
      .mockReturnValue({ finalMessage: () => Promise.resolve(message) });
    return { client: { beta: { messages: { stream } } } as unknown as Anthropic, stream };
  }

  it("sends tools and tool_result blocks, without temperature, and returns tool_use calls", async () => {
    const content = [
      { type: "thinking", thinking: "…", signature: "s" },
      { type: "tool_use", id: "t2", name: "buscar_biblioteca", input: { consulta: "prazo" } },
    ];
    const { client, stream } = fakeClient(content);

    const result = await createAnthropicToolGenerator(client)(PROMPT);

    expect(result.toolCalls).toEqual([{ id: "t2", name: "buscar_biblioteca", arguments: { consulta: "prazo" } }]);
    expect(result.providerContent).toBe(content);
    const request = stream.mock.calls[0][0] as Record<string, unknown>;
    expect(request).not.toHaveProperty("temperature");
    expect(request.tools).toEqual([{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.parameters }]);
    expect((request.messages as unknown[]).slice(1)).toEqual([
      { role: "assistant", content: [{ type: "tool_use", id: "c1", name: "buscar_biblioteca", input: { consulta: "fiança" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: "[F1] Art. 37…" }] },
    ]);
  });
});
