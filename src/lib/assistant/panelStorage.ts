/**
 * The conversation the assistant panel continues, remembered in this browser per user (office computers
 * are shared). Signing out removes it with the other private values.
 */
export const PANEL_CONVERSATION_STORAGE_PREFIX = "magistral-assistente-conversa";

export function panelConversationStorageKey(userId: string): string {
  return `${PANEL_CONVERSATION_STORAGE_PREFIX}:${userId}`;
}
