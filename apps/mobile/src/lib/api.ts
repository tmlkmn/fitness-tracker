import type { ApiErrorBody, ApiErrorCode } from "@fitmusc/shared/api/errors";
import { fetch as expoFetch } from "expo/fetch";

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

async function request(path: string, { method = "GET", body, signal }: ApiOptions, accept: string): Promise<Response> {
  try {
    // expo/fetch: same as the global fetch in SDK 58, but its body is a real
    // stream even if EXPO_PUBLIC_USE_RN_FETCH switches the global back.
    return await expoFetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        accept,
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
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

async function failure(res: Response): Promise<ApiRequestError> {
  const errorBody = parseJson(await res.text()) as Partial<ApiErrorBody> | undefined;
  const retryAfter = Number(res.headers.get("retry-after")) || undefined;
  const error = new ApiRequestError(res.status, errorBody?.error ?? "INTERNAL", errorBody?.details, retryAfter);
  errorListener?.(error);
  return error;
}

/**
 * Calls `/api/v1{path}` with the session cookie. Resolves with the JSON body
 * (undefined for 204), throws ApiRequestError otherwise.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await request(path, options, "application/json");
  if (!res.ok) throw await failure(res);
  if (res.status === 204) return undefined as T;
  return parseJson(await res.text()) as T;
}

/**
 * POSTs to a streaming text/plain endpoint (coach chat, progress analysis)
 * and calls `onText` with everything received so far. Resolves with the
 * whole text; errors before the first byte throw ApiRequestError like api().
 */
export async function apiStream(
  path: string,
  { body, signal, onText }: { body?: unknown; signal?: AbortSignal; onText: (text: string) => void },
): Promise<string> {
  const res = await request(path, { method: "POST", body, signal }, "text/plain");
  if (!res.ok) throw await failure(res);
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    onText(text);
    return text;
  }
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiRequestError(0, "NETWORK");
  }
  text += decoder.decode();
  onText(text);
  return text;
}
