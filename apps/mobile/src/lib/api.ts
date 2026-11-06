import type { ApiErrorBody, ApiErrorCode } from "@fitmusc/shared/api/errors";

import { authClient } from "./auth-client";
import { API_URL } from "./config";

/** A failed `/api/v1` call. `code` is the server's ApiErrorCode, or NETWORK when the request never got an answer. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | "NETWORK",
    readonly details?: unknown,
    /** Seconds, from Retry-After (429). */
    readonly retryAfter?: number,
  ) {
    super(code);
  }
}

type ErrorListener = (error: ApiRequestError) => void;
let errorListener: ErrorListener | null = null;

/** The session provider listens for 401 (sign out) and 403 access denials (status screen). */
export function setApiErrorListener(listener: ErrorListener | null) {
  errorListener = listener;
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

function authHeaders(): Record<string, string> {
  const cookie = authClient.getCookie();
  return cookie ? { cookie } : {};
}

/**
 * Calls `/api/v1{path}` with the session cookie. Resolves with the JSON body
 * (undefined for 204), throws ApiRequestError otherwise.
 */
export async function api<T>(path: string, { method = "GET", body, signal }: ApiOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...authHeaders(),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // The cookie travels in the header above; "include" would interfere.
      credentials: "omit",
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiRequestError(0, "NETWORK");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const errorBody = json as Partial<ApiErrorBody> | undefined;
    const retryAfter = Number(res.headers.get("retry-after")) || undefined;
    const error = new ApiRequestError(res.status, errorBody?.error ?? "INTERNAL", errorBody?.details, retryAfter);
    errorListener?.(error);
    throw error;
  }
  return json as T;
}
