export const ASSISTANT_PATH = "/assistente";

export function conversationPath(id: string): string {
  return `${ASSISTANT_PATH}/${encodeURIComponent(id)}`;
}
