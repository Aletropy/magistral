import "server-only";
import { getDb } from "@/lib/db/client";
import { createChatRepository, type ChatRepository } from "./repository";

export function getChatRepository(): ChatRepository {
  return createChatRepository(getDb());
}
