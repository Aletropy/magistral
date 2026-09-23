export const PERSONAS_PATH = "/personas";
export const NEW_PERSONA_PATH = `${PERSONAS_PATH}/nova`;
export const STYLE_CAPTURE_PATH = `${PERSONAS_PATH}/capturar`;

export function personaEditPath(id: string): string {
  return `${PERSONAS_PATH}/${encodeURIComponent(id)}`;
}

export function personaPlaygroundPath(id: string): string {
  return `${personaEditPath(id)}/playground`;
}
