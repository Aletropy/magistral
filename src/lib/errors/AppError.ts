/**
 * A failure the app expects and can explain: its HTTP status and a pt-BR message safe to show the user.
 * Routes answer with it as is, and background tasks fail with its message without retrying.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}
