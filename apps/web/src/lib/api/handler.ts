import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import {
  ACCESS_DENIALS,
  type ApiErrorBody,
  type ApiErrorCode,
} from "@fitmusc/shared/api/errors";
import {
  requireApiUser,
  type ApiAuthOptions,
  type ApiAuthResult,
} from "@/lib/api-auth";

/**
 * Route-handler wrapper for the versioned mobile API (`src/app/api/v1/**`).
 *
 * The v1 endpoints are thin adapters over the existing server actions: the
 * actions read the session via `headers()`, which inside a route handler are
 * the incoming request's headers (cookie sent by the Expo client), and
 * `revalidatePath` works in route handlers too. Business logic stays in
 * `src/actions/` so web and mobile can never drift apart.
 *
 * Order of operations:
 *   1. `requireApiUser()` — session + approval / freeze / membership / billing
 *   2. zod-validate route params (failure → 404) and input (failure → 400);
 *      input is the query string for GET/HEAD, the JSON body otherwise
 *   3. run the handler; `undefined` → 204, a `Response` (streams) is passed
 *      through as is, anything else → JSON
 *   4. map thrown errors to HTTP status codes (see `toErrorResponse`)
 *
 * Error body shape: `ApiErrorBody` from @fitmusc/shared/api/errors.
 */

export type ApiUser = NonNullable<ApiAuthResult["user"]>;

/**
 * Server-side values whose JSON serialization has the shape of the shared DTO
 * `T` (a DTO string may come from a Date). Annotate a handler's return type
 * with it so action results are checked against @fitmusc/shared/api/dto:
 *
 *   ({ params }): Promise<JsonSource<MealDto[]>> => getMealsByDay(params.dayId)
 */
export type JsonSource<T> = T extends string
  ? T | Date
  : T extends readonly (infer U)[]
    ? readonly JsonSource<U>[]
    : T extends object
      ? { [K in keyof T]: JsonSource<T[K]> }
      : T;

export interface ApiHandlerArgs<TInput, TParams> {
  input: TInput;
  params: TParams;
  user: ApiUser;
  request: Request;
}

interface ApiRouteOptions<TInput, TParams> {
  /** Query string (GET/HEAD) or JSON body (other methods). */
  input?: z.ZodType<TInput>;
  /** Dynamic route segments, e.g. `z.object({ id: z.coerce.number().int().positive() })`. */
  params?: z.ZodType<TParams>;
  /** Relax individual access gates — same flags as `requireApiUser`. */
  auth?: ApiAuthOptions;
  /**
   * Business-rule errors the wrapped action throws, keyed by the exact
   * `Error.message` → `[status, code]`. Checked before the shared mapping.
   */
  errors?: Readonly<Record<string, readonly [number, ApiErrorCode]>>;
  /** Status of a JSON success response — e.g. 202 for a started background job. */
  status?: number;
}

/** Throw from a handler to return a specific status + error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
  }
}

// Vercel caps request bodies at 4.5 MB; nothing in the v1 API comes close to
// this, so anything larger is rejected before JSON.parse.
const MAX_BODY_BYTES = 1_000_000;

export function apiRoute<TInput = undefined, TParams = undefined>(
  options: ApiRouteOptions<TInput, TParams>,
  handler: (args: ApiHandlerArgs<TInput, TParams>) => Promise<unknown>,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string | string[]>> },
  ): Promise<Response> => {
    const { user, response } = await requireApiUser(options.auth);
    if (response) return response;

    try {
      const params = options.params
        ? parseParams(options.params, await context.params)
        : (undefined as TParams);
      const input = options.input
        ? options.input.parse(await readInput(request))
        : (undefined as TInput);

      const result = await handler({ input, params, user, request });
      if (result === undefined) return new Response(null, { status: 204 });
      if (result instanceof Response) return result;
      return NextResponse.json(result, { status: options.status });
    } catch (err) {
      return toErrorResponse(err, options.errors);
    }
  };
}

/** For lookups by id: a missing row is a 404, not a `null` body. */
export function orNotFound<T>(value: T | null | undefined): T {
  if (value == null) throw new ApiError(404, "NOT_FOUND");
  return value;
}

function parseParams<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  // A malformed id can't match any row — same answer as a missing one.
  if (!parsed.success) throw new ApiError(404, "NOT_FOUND");
  return parsed.data;
}

async function readInput(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return Object.fromEntries(new URL(request.url).searchParams);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON");
  }
}

interface ClassifiedError {
  status: number;
  code: ApiErrorCode;
  details?: unknown;
  retryAfter?: string;
}

type RouteErrors = ApiRouteOptions<unknown, unknown>["errors"];

// Only cross-cutting errors from shared infrastructure are mapped here.
// Action-specific business-rule errors are translated per endpoint (the
// route's `errors` option, or an ApiError from the handler) — anything
// unmapped is a 500, reported to Sentry. The AI job runner
// (src/lib/ai-jobs.ts) uses it too, to store a failed job's code.
export function classifyError(err: unknown, routeErrors?: RouteErrors): ClassifiedError {
  if (err instanceof ApiError) {
    return { status: err.status, code: err.code, details: err.details };
  }
  if (err instanceof z.ZodError) {
    return { status: 400, code: "INVALID_INPUT", details: err.issues };
  }

  const message = err instanceof Error ? err.message : "";

  // hasOwn: an error message like "constructor" must not hit Object.prototype.
  if (routeErrors && Object.hasOwn(routeErrors, message)) {
    const [status, code] = routeErrors[message];
    return { status, code };
  }

  // The session was already validated by requireApiUser(), so an
  // "Unauthorized" thrown later comes from the ownership helpers
  // (src/lib/ownership.ts): the record is someone else's or doesn't exist.
  // Must be 404, never 401 — a 401 makes the mobile client drop a valid session.
  if (message === "Unauthorized" || message === "Not found" || message === "NOT_FOUND") {
    return { status: 404, code: "NOT_FOUND" };
  }
  if (message === "Forbidden") return { status: 403, code: "FORBIDDEN" };
  // getAuthUser() inside an action can still deny if the cached session and
  // the DB disagree mid-request.
  const denial = ACCESS_DENIALS.find((code) => code === message);
  if (denial) return { status: 403, code: denial };
  if (message === "InvalidInput" || message === "INVALID_INPUT") {
    return { status: 400, code: "INVALID_INPUT" };
  }

  // checkRateLimit (src/lib/ai.ts) and rateLimit (src/lib/rate-limit.ts)
  const rate = /^(RATE_LIMITED|COOLDOWN)(?::(\d+))?$/.exec(message);
  if (rate) {
    return { status: 429, code: rate[1] as "RATE_LIMITED" | "COOLDOWN", retryAfter: rate[2] };
  }
  if (message === "AI_UNAVAILABLE") return { status: 503, code: "AI_UNAVAILABLE" };

  console.error("[api/v1] unhandled error:", err);
  Sentry.captureException(err, { tags: { area: "api-v1" } });
  return { status: 500, code: "INTERNAL" };
}

function toErrorResponse(err: unknown, routeErrors: RouteErrors): Response {
  const { status, code, details, retryAfter } = classifyError(err, routeErrors);
  const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;
  return json(status, { error: code, details }, headers);
}

function json(status: number, body: ApiErrorBody, headers?: HeadersInit): Response {
  return NextResponse.json(body, { status, headers });
}
