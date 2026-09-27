import { AppError } from "@/lib/errors/AppError";
import { HTTP_TOO_MANY_REQUESTS, HTTP_UNPROCESSABLE_CONTENT } from "@/lib/http/status";

/** The task was cancelled before its result could be saved; the result is discarded. */
export class TaskCanceledError extends Error {
  constructor() {
    super("The task was canceled.");
    this.name = "TaskCanceledError";
  }
}

/** The task's input can't be used (e.g. its files were already cleaned up); it fails without retrying. */
export class TaskInputError extends AppError {
  constructor(message: string) {
    super(HTTP_UNPROCESSABLE_CONTENT, message);
  }
}

/** The user already has as many tasks waiting for the AI as one person may queue. */
export class TaskQuotaError extends AppError {
  constructor(message: string) {
    super(HTTP_TOO_MANY_REQUESTS, message);
  }
}
