import { describe, expect, it, vi } from "vitest";
import type { StyleExtraction } from "@/lib/style/styleProfileSchema";
import {
  CONFIGURATION_ERROR,
  DAILY_QUOTA_EXHAUSTED,
  RATE_LIMITED,
  SERVICE_UNAVAILABLE,
  UPSTREAM_TIMEOUT,
} from "../errors";
import { OpenRouterApiError, type ChatCompletion, type OpenRouterClient } from "./api";
import { DEFAULT_OPENROUTER_MODELS, OPENROUTER_BASE_URL, resolveOpenRouterModels } from "./config";
import { openRouterErrorInfo } from "./errors";
import { createOpenRouterStyleExtractor } from "./extractStyle";
import { createOpenRouterGenerator } from "./generate";
import { createOpenRouterClient, rotateModels } from "./httpClient";

const PROMPT = { system: "Você é um advogado.", user: "Redija um NDA.", temperature: 0.3 };
const MODELS = ["a/primary:free", "b/fallback:free"];

function completion(overrides: Partial<ChatCompletion["choices"][number]> = {}, model = "b/fallback:free"): ChatCompletion {
  return {
    model,
    choices: [{ finish_reason: "stop", message: { content: "# ACORDO", refusal: null }, ...overrides }],
    usage: { prompt_tokens: 900, completion_tokens: 3000, completion_tokens_details: { reasoning_tokens: 1000 } },
  };
}

function fakeClient(result: ChatCompletion) {
  const chat = vi.fn<OpenRouterClient["chat"]>().mockResolvedValue(result);
  return { client: { chat }, chat };
}

describe("resolveOpenRouterModels", () => {
  it("parses a comma-separated list, dropping blanks and duplicates, with defaults when empty", () => {
    expect(resolveOpenRouterModels(" a:free, ,b:free,a:free ")).toEqual(["a:free", "b:free"]);
    expect(resolveOpenRouterModels(undefined)).toEqual([...DEFAULT_OPENROUTER_MODELS]);
  });
});

describe("createOpenRouterGenerator", () => {
  it("sends the fallback list and messages, and reports the model that answered with split usage", async () => {
    const { client, chat } = fakeClient(completion());

    await expect(createOpenRouterGenerator(client, MODELS)(PROMPT)).resolves.toEqual({
      text: "# ACORDO",
      model: "b/fallback:free",
      usage: { inputTokens: 900, outputTokens: 2000, thinkingTokens: 1000 },
    });
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        models: MODELS,
        temperature: 0.3,
        messages: [
          { role: "system", content: PROMPT.system },
          { role: "user", content: PROMPT.user },
        ],
      }),
    );
  });

  it.each([
    [{ finish_reason: "length" }, "truncated"],
    [{ finish_reason: "content_filter" }, "refusal"],
    [{ message: { content: null, refusal: "Não posso ajudar." } }, "refusal"],
  ] as const)("maps %j to %s", async (choice, reason) => {
    const { client } = fakeClient(completion(choice));
    await expect(createOpenRouterGenerator(client, MODELS)(PROMPT)).rejects.toMatchObject({ reason });
  });

});

describe("createOpenRouterStyleExtractor", () => {
  it("requests strict JSON only from providers that support it, without the $schema keyword", async () => {
    const extraction: StyleExtraction = {
      profile: {
        structuralFramework: "Cláusulas.",
        sectionOrder: [],
        vocabularyComplexity: "média",
        vocabularyNotes: "",
        sentenceLength: { averageWords: 20, shortPercent: 30, mediumPercent: 50, longPercent: 20, notes: "" },
        headerConventions: "Caixa alta.",
        headerExamples: [],
        citationFormatting: "nenhuma",
        tone: "Direto.",
        recurringExpressions: [],
        formattingRules: [],
      },
      suggestedName: "Contratos",
      suggestedSystemInstruction: "Você é um advogado.",
      suggestedToneParameters: [],
      keyExcerpts: [],
    };
    const { client, chat } = fakeClient(completion({ message: { content: JSON.stringify(extraction), refusal: null } }));

    await expect(createOpenRouterStyleExtractor(client, MODELS)("Texto.")).resolves.toMatchObject({ extraction });
    const request = chat.mock.calls[0][0];
    expect(request.provider).toEqual({ require_parameters: true });
    expect(request.response_format?.json_schema.strict).toBe(true);
    expect(request.response_format?.json_schema.schema).not.toHaveProperty("$schema");
  });

  it("rejects malformed JSON as invalid output", async () => {
    const { client } = fakeClient(completion({ message: { content: "{perfil", refusal: null } }));
    await expect(createOpenRouterStyleExtractor(client, MODELS)("Texto.")).rejects.toMatchObject({
      reason: "invalid_output",
    });
  });
});

describe("createOpenRouterClient", () => {
  function fetchReturning(status: number, body: unknown) {
    return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  }
  const REQUEST = { models: MODELS, messages: [], temperature: 0, max_tokens: 10 };

  it("posts to the chat endpoint with the key and parses the completion", async () => {
    const fetchImpl = fetchReturning(200, completion());
    await expect(createOpenRouterClient("sk-test", fetchImpl).chat(REQUEST)).resolves.toMatchObject({
      model: "b/fallback:free",
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${OPENROUTER_BASE_URL}/chat/completions`);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sk-test");
  });

  it("turns error responses, including 200s carrying an error, into OpenRouterApiError", async () => {
    const limited = { error: { code: 429, message: "Rate limit exceeded: free-models-per-day", metadata: { error_type: "rate_limit_exceeded" } } };
    await expect(createOpenRouterClient("k", fetchReturning(429, limited)).chat(REQUEST)).rejects.toMatchObject({
      status: 429,
      errorType: "rate_limit_exceeded",
    });
    await expect(
      createOpenRouterClient("k", fetchReturning(200, { error: { code: 400, message: "Bad request" } })).chat(REQUEST),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("retries a provider that failed mid-generation once, starting from the next model", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(completion({ finish_reason: "error" }))))
      .mockResolvedValueOnce(new Response(JSON.stringify(completion())));

    await expect(createOpenRouterClient("k", fetchImpl).chat(REQUEST)).resolves.toMatchObject({ model: "b/fallback:free" });
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body)).models).toEqual(rotateModels(MODELS));
  });

  it("gives up after the retry, and never retries rate limits", async () => {
    const failing = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error: { code: 503, message: "down" } }), { status: 503 }));
    await expect(createOpenRouterClient("k", failing).chat(REQUEST)).rejects.toMatchObject({ status: 503 });
    expect(failing).toHaveBeenCalledTimes(2);

    const limited = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error: { code: 429, message: "slow down" } }), { status: 429 }));
    await expect(createOpenRouterClient("k", limited).chat(REQUEST)).rejects.toMatchObject({ status: 429 });
    expect(limited).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout while reading the body as 504, without retrying", async () => {
    const slowBody = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
        },
      }),
    );
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(slowBody);
    await expect(createOpenRouterClient("k", fetchImpl).chat(REQUEST)).rejects.toMatchObject({ status: 504 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports network failures as 503", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(createOpenRouterClient("k", fetchImpl).chat(REQUEST)).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("openRouterErrorInfo", () => {
  it("maps the daily free limit, other rate limits, missing credits and outages", () => {
    expect(openRouterErrorInfo(new OpenRouterApiError(429, "Rate limit exceeded: free-models-per-day"))).toBe(
      DAILY_QUOTA_EXHAUSTED,
    );
    expect(openRouterErrorInfo(new OpenRouterApiError(429, "Rate limit exceeded: free-models-per-min"))).toBe(RATE_LIMITED);
    expect(openRouterErrorInfo(new OpenRouterApiError(402, "Insufficient credits"))).toBe(CONFIGURATION_ERROR);
    expect(openRouterErrorInfo(new OpenRouterApiError(503, "down"))).toBe(SERVICE_UNAVAILABLE);
    expect(openRouterErrorInfo(new OpenRouterApiError(504, "slow"))).toBe(UPSTREAM_TIMEOUT);
    expect(openRouterErrorInfo(new Error("other"))).toBeNull();
  });
});
