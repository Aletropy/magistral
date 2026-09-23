export const PERSONAS_PATH = "/personas";
export const NEW_PERSONA_PATH = `${PERSONAS_PATH}/nova`;

export function personaEditPath(id: string): string {
  return `${PERSONAS_PATH}/${encodeURIComponent(id)}`;
}
