import { AppError } from "@/lib/errors/AppError";
import { HTTP_BAD_REQUEST } from "@/lib/http/status";

/** The request points at data that doesn't exist (persona, clauses) or can't be used (empty library). */
export class MinutaRequestError extends AppError {
  constructor(message: string) {
    super(HTTP_BAD_REQUEST, message);
  }
}
