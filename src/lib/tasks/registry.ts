import "server-only";
import { chatReplyTask } from "@/lib/chat/chatReplyTask";
import { draftMinutaTask } from "@/lib/minuta/draftMinutaTask";
import { suggestDraftTask } from "@/lib/minuta/suggestDraftTask";
import { libraryDemoTask, libraryReindexTask, librarySyncTask, libraryUploadTask } from "@/lib/rag/libraryTasks";
import { captureStyleTask } from "@/lib/style/captureStyleTask";
import type { AnyTaskHandler } from "./handler";
import type { TaskKind } from "./types";

/** Every kind of background work, keyed by kind so the compiler flags a kind without a handler. */
export const TASK_HANDLERS: Record<TaskKind, AnyTaskHandler> = {
  "minuta.draft": draftMinutaTask,
  "library.upload": libraryUploadTask,
  "library.sync": librarySyncTask,
  "library.reindex": libraryReindexTask,
  "library.demo": libraryDemoTask,
  "style.capture": captureStyleTask,
  "minuta.extract": suggestDraftTask,
  "chat.reply": chatReplyTask,
};
