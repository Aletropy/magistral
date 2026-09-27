import { describe, expect, it } from "vitest";
import { ChatBusyError } from "@/lib/chat/errors";
import { DocumentExtractionError } from "@/lib/documents/errors";
import { LlmOutputError, UNEXPECTED_ERROR } from "@/lib/llm/errors";
import { MinutaRequestError } from "@/lib/minuta/errors";
import { LibraryIndexMismatchError } from "@/lib/rag/errors";
import { TaskQuotaError } from "@/lib/tasks/errors";
import { toPublicError } from "./toPublicError";

describe("toPublicError", () => {
  it("answers app errors with their own status and message", () => {
    expect(toPublicError(new MinutaRequestError("Persona não encontrada."))).toEqual({
      status: 400,
      message: "Persona não encontrada.",
    });
    expect(toPublicError(new ChatBusyError()).status).toBe(409);
    expect(toPublicError(new LibraryIndexMismatchError()).status).toBe(409);
    expect(toPublicError(new TaskQuotaError("Fila cheia.")).status).toBe(429);
  });

  it("maps document and LLM failures, and hides anything else", () => {
    expect(toPublicError(new DocumentExtractionError("no_text")).status).toBe(422);
    expect(toPublicError(new LlmOutputError("truncated")).status).toBe(502);
    expect(toPublicError(new Error("SQLITE_BUSY: detalhe interno"))).toBe(UNEXPECTED_ERROR);
  });
});
