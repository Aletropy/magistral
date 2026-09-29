import "server-only";
import { getDb } from "@/lib/db/client";
import { createFeedbackRepository, type FeedbackRepository } from "./repository";

export function getFeedbackRepository(): FeedbackRepository {
  return createFeedbackRepository(getDb());
}
