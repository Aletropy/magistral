import { describe, expect, it, vi } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { PERSONA_PROMPT_STYLES } from "@/lib/personas/promptStyles";
import { MinutaGenerationError } from "./errors";
import { generateMinuta } from "./generateMinuta";
import type { MinutaGenerator } from "./types";

const REQUEST: MinutaRequest = {
  documentType: "nda",
  customDocumentType: "",
  parties: [
    { name: "Acme Ltda.", role: "Reveladora", qualification: "" },
    { name: "Beta S.A.", role: "Receptora", qualification: "" },
  ],
  clauses: "",
  persona: "conservador",
};

describe("generateMinuta", () => {
  it("sends the persona system prompt and the request as the user prompt", async () => {
    const generate = vi.fn<MinutaGenerator>().mockResolvedValue("# ACORDO");
    await generateMinuta(generate, REQUEST);

    const [{ system, user }] = generate.mock.calls[0];
    expect(system.startsWith(PERSONA_PROMPT_STYLES.conservador.role)).toBe(true);
    expect(user).toContain("Acme Ltda.");
  });

  it("returns the trimmed Markdown", async () => {
    const generate: MinutaGenerator = async () => "\n# ACORDO\n\nTexto.  ";
    await expect(generateMinuta(generate, REQUEST)).resolves.toBe("# ACORDO\n\nTexto.");
  });

  it("rejects an empty answer", async () => {
    const generate: MinutaGenerator = async () => "   ";
    await expect(generateMinuta(generate, REQUEST)).rejects.toEqual(new MinutaGenerationError("empty"));
  });
});
