import "server-only";
import { getDb } from "@/lib/db/client";
import { createTaskRepository, type TaskRepository } from "./repository";

export function getTaskRepository(): TaskRepository {
  return createTaskRepository(getDb());
}
