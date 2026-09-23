import { z } from "zod";

export const MAX_CHAT_MESSAGE_CHARS = 8000;
export const MAX_CHAT_TITLE_CHARS = 120;
const MAX_ID_CHARS = 64;

const messageSchema = z
  .string({ error: "Escreva uma mensagem." })
  .trim()
  .min(1, { error: "Escreva uma mensagem." })
  .max(MAX_CHAT_MESSAGE_CHARS, { error: `Use no máximo ${MAX_CHAT_MESSAGE_CHARS} caracteres.` });

export const chatMessageInputSchema = z.object({ message: messageSchema });
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

export const newConversationSchema = z.object({
  message: messageSchema,
  /** Starts a conversation about a saved minuta. */
  minutaId: z.string().max(MAX_ID_CHARS).nullable().default(null),
  useLibrary: z.boolean().default(true),
});
export type NewConversationInput = z.input<typeof newConversationSchema>;

export const conversationUpdateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: "Dê um título à conversa." })
      .max(MAX_CHAT_TITLE_CHARS, { error: `Use no máximo ${MAX_CHAT_TITLE_CHARS} caracteres.` })
      .optional(),
    useLibrary: z.boolean().optional(),
  })
  .refine((update) => update.title !== undefined || update.useLibrary !== undefined, {
    error: "Nada para atualizar.",
  });
export type ConversationUpdate = z.infer<typeof conversationUpdateSchema>;

/** A conversation is named after its first question, cut at a word boundary. */
export function titleFromMessage(message: string): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= MAX_CHAT_TITLE_CHARS) return oneLine;
  const cut = oneLine.slice(0, MAX_CHAT_TITLE_CHARS - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
