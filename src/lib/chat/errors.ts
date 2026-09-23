import { CHAT_BUSY_MESSAGE } from "./messages";

/** A reply is still being written; the conversation takes one question at a time. */
export class ChatBusyError extends Error {
  constructor() {
    super(CHAT_BUSY_MESSAGE);
    this.name = "ChatBusyError";
  }
}
