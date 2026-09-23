import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createPersonaRepository, type PersonaRepository } from "./repository";
import type { PersonaInput } from "./schema";
import { BUILTIN_PERSONAS, DEFAULT_PERSONA_ID } from "./seeds";

const INPUT: PersonaInput = {
  name: "PGM - Agressivo Tributário",
  description: "Pareceres da Procuradoria em execução fiscal.",
  systemInstruction: "Você é procurador municipal especializado em execução fiscal.",
  toneParameters: ["Use voz ativa.", "Limite parágrafos a 3 frases."],
  temperature: 0.2,
  examples: ["Exemplo um.", "Exemplo dois."],
};

describe("createPersonaRepository", () => {
  let repository: PersonaRepository;

  beforeEach(() => {
    repository = createPersonaRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  it("lists the seeded personas first, with their examples", () => {
    repository.create(INPUT);
    const personas = repository.list();

    expect(personas.slice(0, BUILTIN_PERSONAS.length).every((persona) => persona.isBuiltin)).toBe(true);
    expect(personas.at(-1)?.name).toBe(INPUT.name);
    expect(repository.get(DEFAULT_PERSONA_ID)?.examples).toHaveLength(1);
  });

  it("creates a persona and reads it back with ordered lists", () => {
    const created = repository.create(INPUT);

    expect(created).toMatchObject({ ...INPUT, isBuiltin: false });
    expect(repository.get(created.id)).toEqual(created);
  });

  it("updates fields and replaces the examples", () => {
    const created = repository.create(INPUT);
    const updated = repository.update(created.id, { ...INPUT, temperature: 0.7, examples: ["Só um."] });

    expect(updated).toMatchObject({ temperature: 0.7, examples: ["Só um."] });
  });

  it("returns null when updating a persona that does not exist", () => {
    expect(repository.update("missing", INPUT)).toBeNull();
  });

  it("deletes custom personas but never built-in ones", () => {
    const created = repository.create(INPUT);

    expect(repository.delete(created.id)).toBe("deleted");
    expect(repository.get(created.id)).toBeNull();
    expect(repository.delete(created.id)).toBe("not_found");
    expect(repository.delete(DEFAULT_PERSONA_ID)).toBe("builtin");
    expect(repository.get(DEFAULT_PERSONA_ID)).not.toBeNull();
  });
});
