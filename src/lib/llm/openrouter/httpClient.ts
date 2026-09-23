import {
  OpenRouterApiError,
  chatCompletionSchema,
  openRouterErrorBodySchema,
  type ChatCompletion,
  type ChatRequest,
  type OpenRouterClient,
} from "./api";
import { OPENROUTER_APP_TITLE, OPENROUTER_APP_URL, OPENROUTER_BASE_URL, OPENROUTER_TIMEOUT_MS } from "./config";

const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;
/**
 * Free providers sometimes drop a request mid-generation, which OpenRouter's own model fallback doesn't
 * cover. Those get one more try, starting from the next model. Timeouts don't: they already used the budget.
 */
const FINISH_REASON_ERROR = "error";
const RETRYABLE_STATUSES = new Set([HTTP_BAD_GATEWAY, HTTP_SERVICE_UNAVAILABLE]);

/** The same list starting one model later, so a retry doesn't go straight back to the one that failed. */
export function rotateModels(models: string[]): string[] {
  return models.length > 1 ? [...models.slice(1), models[0]] : models;
}

async function readError(response: Response): Promise<OpenRouterApiError> {
  const parsed = openRouterErrorBodySchema.safeParse(await response.json().catch(() => null));
  const message = parsed.success ? parsed.data.error.message : response.statusText;
  const errorType = parsed.success ? (parsed.data.error.metadata?.error_type ?? null) : null;
  return new OpenRouterApiError(response.status, message, errorType);
}

/** A fetch-based OpenRouter client; errors come back as OpenRouterApiError with the upstream status. */
export function createOpenRouterClient(apiKey: string, fetchImpl: typeof fetch = fetch): OpenRouterClient {
  async function send(request: ChatRequest): Promise<ChatCompletion> {
    let response: Response;
    try {
      response = await fetchImpl(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_APP_URL,
          "X-Title": OPENROUTER_APP_TITLE,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new OpenRouterApiError(timedOut ? HTTP_GATEWAY_TIMEOUT : HTTP_SERVICE_UNAVAILABLE, String(error));
    }
    if (!response.ok) throw await readError(response);

    const body: unknown = await response.json();
    // OpenRouter can answer 200 with an error object when the upstream provider failed.
    const embeddedError = openRouterErrorBodySchema.safeParse(body);
    if (embeddedError.success) {
      const { code, message, metadata } = embeddedError.data.error;
      throw new OpenRouterApiError(typeof code === "number" ? code : HTTP_BAD_GATEWAY, message, metadata?.error_type ?? null);
    }
    const completion = chatCompletionSchema.safeParse(body);
    if (!completion.success) throw new OpenRouterApiError(HTTP_BAD_GATEWAY, "Unexpected response shape.");
    return completion.data;
  }

  return {
    async chat(request: ChatRequest) {
      try {
        return checkFinish(await send(request));
      } catch (error) {
        if (!(error instanceof OpenRouterApiError) || !RETRYABLE_STATUSES.has(error.status)) throw error;
        return checkFinish(await send({ ...request, models: rotateModels(request.models) }));
      }
    },
  };
}

/** A provider that failed after answering 200 reports finish_reason "error"; treat it like a 502 so it is retried. */
function checkFinish(completion: ChatCompletion): ChatCompletion {
  if (completion.choices[0].finish_reason === FINISH_REASON_ERROR) {
    throw new OpenRouterApiError(HTTP_BAD_GATEWAY, "The upstream provider failed mid-generation.");
  }
  return completion;
}
