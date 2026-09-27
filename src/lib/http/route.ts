import "server-only";
import type { z } from "zod";
import { runAsUser } from "@/lib/auth/actor";
import { FORBIDDEN_MESSAGE, NOT_SIGNED_IN_MESSAGE } from "@/lib/auth/messages";
import { readSession } from "@/lib/auth/session";
import type { ActiveSession } from "@/lib/auth/sessionRepository";
import { isAdmin, type User } from "@/lib/auth/types";
import { AppError } from "@/lib/errors/AppError";
import { toPublicError } from "@/lib/errors/toPublicError";
import { ALLOWED_HOSTS_ENV_VAR, configuredHosts, isAllowedHost } from "./allowedHosts";
import { readFormBody, readJsonBody } from "./readBody";
import { errorResponse } from "./responses";
import { isSameOriginRequest } from "./sameOrigin";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_MISDIRECTED_REQUEST, HTTP_UNAUTHORIZED } from "./status";

/** Most JSON bodies are small; routes that take documents or spreadsheets raise their own limit. */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const HTTP_SERVER_ERROR_MIN = 500;
const UNKNOWN_HOST_MESSAGE = "Endereço não reconhecido por este servidor.";
const CROSS_SITE_MESSAGE = "Requisição de outro site bloqueada.";

type Access = "user" | "admin";

interface RouteOptions<B> {
  /** Who may call the route; "admin" also needs the admin role. Defaults to "user". */
  access?: Access;
  /** Validates the JSON body; its first issue becomes a 400. */
  body?: z.ZodType<B>;
  /** The largest body the route reads, JSON or multipart. */
  maxBodyBytes?: number;
}

interface PublicRouteInput<B> {
  request: Request;
  body: B;
  /** Reads the multipart body within the route's byte limit. */
  readForm(): Promise<FormData>;
}

export interface RouteInput<B> extends PublicRouteInput<B> {
  user: User;
  /** The signed-in session, e.g. to keep it when the user ends their other sessions. */
  sessionId: string;
}

type Handler<Input, C> = (input: Input, context: C) => Promise<Response> | Response;

/** Rejects requests addressed to a hostname the office doesn't use (DNS rebinding) or sent by another site. */
function checkRequestSource(request: Request): void {
  if (!isAllowedHost(request.headers.get("host"), configuredHosts(process.env[ALLOWED_HOSTS_ENV_VAR]))) {
    throw new AppError(HTTP_MISDIRECTED_REQUEST, UNKNOWN_HOST_MESSAGE);
  }
  if (!isSameOriginRequest(request)) throw new AppError(HTTP_FORBIDDEN, CROSS_SITE_MESSAGE);
}

async function authenticate(access: Access): Promise<ActiveSession> {
  const session = await readSession();
  if (!session) throw new AppError(HTTP_UNAUTHORIZED, NOT_SIGNED_IN_MESSAGE);
  if (access === "admin" && !isAdmin(session.user)) throw new AppError(HTTP_FORBIDDEN, FORBIDDEN_MESSAGE);
  return session;
}

async function readInput<B>(request: Request, options: RouteOptions<B>): Promise<PublicRouteInput<B>> {
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  let body = undefined as B;
  if (options.body) {
    const parsed = options.body.safeParse(await readJsonBody(request, maxBytes));
    if (!parsed.success) throw new AppError(HTTP_BAD_REQUEST, parsed.error.issues[0].message);
    body = parsed.data;
  }
  return { request, body, readForm: () => readFormBody(request, maxBytes) };
}

/** Maps any failure to a status and a pt-BR message; unexpected and upstream failures are logged. */
function failureResponse(request: Request, error: unknown): Response {
  const { status, message } = toPublicError(error);
  if (!(error instanceof AppError) && status >= HTTP_SERVER_ERROR_MIN) {
    console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed`, error);
  }
  return errorResponse(status, message);
}

/**
 * A route handler for signed-in users. It checks the request's origin and host, the session and role,
 * reads and validates the body within a size limit, attributes LLM usage to the user, and turns
 * failures into safe JSON errors.
 */
export function defineRoute<C = unknown, B = undefined>(
  options: RouteOptions<B>,
  handler: Handler<RouteInput<B>, C>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      checkRequestSource(request);
      const { id: sessionId, user } = await authenticate(options.access ?? "user");
      const input = await readInput(request, options);
      return await runAsUser(user.id, async () => handler({ ...input, user, sessionId }, context));
    } catch (error) {
      return failureResponse(request, error);
    }
  };
}

/** A route anyone may call (signing in, first setup), with the same origin, host and body checks. */
export function definePublicRoute<C = unknown, B = undefined>(
  options: Omit<RouteOptions<B>, "access">,
  handler: Handler<PublicRouteInput<B>, C>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      checkRequestSource(request);
      return await handler(await readInput(request, options), context);
    } catch (error) {
      return failureResponse(request, error);
    }
  };
}
