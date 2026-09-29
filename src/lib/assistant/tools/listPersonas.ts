import { z } from "zod";
import type { PersonaRepository } from "@/lib/personas/repository";
import { STYLE_SLIDER_MAX } from "@/lib/personas/styleSliders";
import { plural } from "@/lib/text/plural";
import { defineReadTool } from "../tool";

export function createListPersonasTool({ personas }: { personas: PersonaRepository }) {
  return defineReadTool({
    name: "listar_personas",
    description:
      "Lista as personas do escritório (o tom com que as minutas são escritas), com o id de cada uma. Use para recomendar uma persona ou antes de gerar, preparar ou ajustar uma minuta ou persona.",
    input: z.object({}),
    progressLabel: "Consultando as personas",
    async run() {
      const all = personas.list();
      const lines = all.map((persona) => {
        const { formality, aggressiveness, length } = persona.styleSliders;
        const sliders = `formalidade ${formality}/${STYLE_SLIDER_MAX}, firmeza ${aggressiveness}/${STYLE_SLIDER_MAX}, extensão ${length}/${STYLE_SLIDER_MAX}`;
        const forbidden = persona.negativeConstraints.length > 0 ? `; termos proibidos: ${persona.negativeConstraints.join(", ")}` : "";
        return `- id ${persona.id}: ${persona.name}. ${persona.description} (${sliders}${forbidden})`;
      });
      return {
        output: lines.length > 0 ? lines.join("\n") : "Nenhuma persona cadastrada.",
        summary: `Consultei as personas (${plural(all.length, "encontrada", "encontradas")})`,
      };
    },
  });
}
