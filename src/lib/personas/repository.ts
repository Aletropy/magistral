import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import { styleSlidersSchema, type PersonaInput } from "./schema";
import type { Persona } from "./types";

const stringListJson = z
  .string()
  .transform((json) => JSON.parse(json) as unknown)
  .pipe(z.array(z.string()));

const styleSlidersJson = z
  .string()
  .transform((json) => JSON.parse(json) as unknown)
  .pipe(styleSlidersSchema);

const personaRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  system_instruction: z.string(),
  tone_parameters: stringListJson,
  temperature: z.number(),
  negative_constraints: stringListJson,
  style_sliders: styleSlidersJson,
  is_builtin: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

const exampleRowSchema = z.object({ content: z.string() });

export type PersonaDeletion = "deleted" | "not_found" | "builtin";

export interface PersonaRepository {
  list(): Persona[];
  get(id: string): Persona | null;
  create(input: PersonaInput): Persona;
  /** Returns null when no persona has this id. */
  update(id: string, input: PersonaInput): Persona | null;
  delete(id: string): PersonaDeletion;
}

export function createPersonaRepository(db: DatabaseSync): PersonaRepository {
  const selectAll = db.prepare("SELECT * FROM personas ORDER BY is_builtin DESC, name COLLATE NOCASE");
  const selectOne = db.prepare("SELECT * FROM personas WHERE id = ?");
  const selectExamples = db.prepare(
    "SELECT content FROM persona_examples WHERE persona_id = ? ORDER BY position",
  );
  const insertPersona = db.prepare(
    `INSERT INTO personas (id, name, description, system_instruction, tone_parameters, temperature,
                           negative_constraints, style_sliders)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const updatePersona = db.prepare(
    `UPDATE personas
     SET name = ?, description = ?, system_instruction = ?, tone_parameters = ?, temperature = ?,
         negative_constraints = ?, style_sliders = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  );
  const deleteExamples = db.prepare("DELETE FROM persona_examples WHERE persona_id = ?");
  const insertExample = db.prepare(
    "INSERT INTO persona_examples (persona_id, position, content) VALUES (?, ?, ?)",
  );
  const deletePersona = db.prepare("DELETE FROM personas WHERE id = ?");

  function toPersona(row: unknown): Persona {
    const parsed = personaRowSchema.parse(row);
    return {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      systemInstruction: parsed.system_instruction,
      toneParameters: parsed.tone_parameters,
      temperature: parsed.temperature,
      examples: selectExamples.all(parsed.id).map((example) => exampleRowSchema.parse(example).content),
      negativeConstraints: parsed.negative_constraints,
      styleSliders: parsed.style_sliders,
      isBuiltin: parsed.is_builtin === 1,
      createdAt: parsed.created_at,
      updatedAt: parsed.updated_at,
    };
  }

  function replaceExamples(id: string, examples: string[]): void {
    deleteExamples.run(id);
    examples.forEach((example, position) => insertExample.run(id, position, example));
  }

  function get(id: string): Persona | null {
    const row = selectOne.get(id);
    return row ? toPersona(row) : null;
  }

  return {
    list: () => selectAll.all().map(toPersona),

    get,

    create(input) {
      const id = randomUUID();
      withTransaction(db, () => {
        insertPersona.run(
          id,
          input.name,
          input.description,
          input.systemInstruction,
          JSON.stringify(input.toneParameters),
          input.temperature,
          JSON.stringify(input.negativeConstraints),
          JSON.stringify(input.styleSliders),
        );
        replaceExamples(id, input.examples);
      });
      return get(id)!;
    },

    update(id, input) {
      const changed = withTransaction(db, () => {
        const { changes } = updatePersona.run(
          input.name,
          input.description,
          input.systemInstruction,
          JSON.stringify(input.toneParameters),
          input.temperature,
          JSON.stringify(input.negativeConstraints),
          JSON.stringify(input.styleSliders),
          id,
        );
        if (changes === 0) return false;
        replaceExamples(id, input.examples);
        return true;
      });
      return changed ? get(id) : null;
    },

    delete(id) {
      const persona = get(id);
      if (!persona) return "not_found";
      if (persona.isBuiltin) return "builtin";
      deletePersona.run(id);
      return "deleted";
    },
  };
}
