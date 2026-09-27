import { AppError } from "@/lib/errors/AppError";
import { HTTP_CONFLICT } from "@/lib/http/status";
import { CHAT_BUSY_MESSAGE } from "./messages";

/** A reply is still being written; the conversation takes one question at a time. */
export class ChatBusyError extends AppError {
  constructor() {
    super(HTTP_CONFLICT, CHAT_BUSY_MESSAGE);
  }
}
