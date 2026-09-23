/** The task was cancelled before its result could be saved; the result is discarded. */
export class TaskCanceledError extends Error {
  constructor() {
    super("The task was canceled.");
    this.name = "TaskCanceledError";
  }
}

/** The task's input can't be used (e.g. its files were already cleaned up); it fails without retrying. */
export class TaskInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskInputError";
  }
}
