import { randomUUID } from "node:crypto";
import { FunctionCallingConfigMode, type Content, type GoogleGenAI, type Part } from "@google/genai";
import type { AgentMessage, ToolCall, ToolChatGenerator } from "../tools/types";
import { checkGeminiResponse } from "./checkResponse";
import { GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "./config";

/** Marks ids Gemini didn't send: the matching function response then goes back without one. */
const LOCAL_ID_PREFIX = "local-";

function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

function assistantContent(message: Extract<AgentMessage, { role: "assistant" }>): Content {
  // Within one reply the model's own content goes back unchanged, so thought signatures stay valid.
  if (message.providerContent) return message.providerContent as Content;
  const parts: Part[] = [];
  if (message.content) parts.push({ text: message.content });
  for (const call of message.toolCalls) {
    parts.push({
      functionCall: {
        ...(!isLocalId(call.id) && { id: call.id }),
        name: call.name,
        args: (call.arguments ?? {}) as Record<string, unknown>,
      },
    });
  }
  return { role: "model", parts };
}

/** Gemini wants the answers to one step's calls in a single user turn. */
function toContents(messages: AgentMessage[]): Content[] {
  const contents: Content[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.content }] });
    } else if (message.role === "assistant") {
      contents.push(assistantContent(message));
    } else {
      const part: Part = {
        functionResponse: {
          ...(!isLocalId(message.toolCallId) && { id: message.toolCallId }),
          name: message.name,
          response: { output: message.content },
        },
      };
      const previous = contents.at(-1);
      if (previous?.role === "user" && previous.parts?.every((existing) => existing.functionResponse)) {
        previous.parts.push(part);
      } else {
        contents.push({ role: "user", parts: [part] });
      }
    }
  }
  return contents;
}

/** One agent step over Gemini function calling. */
export function createGeminiToolGenerator(client: GoogleGenAI): ToolChatGenerator {
  return async ({ system, messages, tools, temperature }, options = {}) => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: toContents(messages),
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        abortSignal: options.signal,
        ...(tools.length > 0 && {
          tools: [
            {
              functionDeclarations: tools.map(({ name, description, parameters }) => ({
                name,
                description,
                parametersJsonSchema: parameters,
              })),
            },
          ],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        }),
      },
    });

    const usage = checkGeminiResponse(response);
    const content = response.candidates?.[0]?.content;
    const parts = content?.parts ?? [];
    const text = parts
      .filter((part) => part.text && !part.thought)
      .map((part) => part.text)
      .join("");
    const toolCalls: ToolCall[] = parts.flatMap(({ functionCall }) =>
      functionCall?.name
        ? [{ id: functionCall.id ?? `${LOCAL_ID_PREFIX}${randomUUID()}`, name: functionCall.name, arguments: functionCall.args ?? {} }]
        : [],
    );
    return { text, toolCalls, providerContent: content, model: GEMINI_MODEL, usage };
  };
}
