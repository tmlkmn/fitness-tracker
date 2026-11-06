import { storageAdapter } from "@better-auth/expo/client";
import type { LocaleResultDto } from "@fitmusc/shared/api/dto";
import { ACCESS_DENIALS, type AccessDenial } from "@fitmusc/shared/api/errors";
import type { Locale } from "@fitmusc/shared/locale";
import * as SecureStore from "expo-secure-store";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { api, setApiErrorListener } from "./api";
import { AUTH_STORAGE_PREFIX, authClient, type SessionUser } from "./auth-client";
import { forgetCache, persistCacheFor } from "./offline-cache";
import { clearOutbox, setOutboxUser } from "./outbox";
import { unregisterPush } from "./push";
import { queryClient } from "./query-client";

/** Why the signed-in user can't use the app right now (→ the blocked screen). */
export type Blocked = AccessDenial | "MustChangePassword";

export type SignInResult = { ok: true } | { ok: false; reason: "invalidCredentials" | "generic" };

interface SessionValue {
  user: SessionUser | null;
  isLoading: boolean;
  blocked: Blocked | null;
  /** The user's language (null before sign-in → the device language). */
  locale: string | null;
  setLocale: (locale: Locale) => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  /** After the user fixed it elsewhere (e.g. on the web) — the next request re-checks. */
  retryAccess: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const isAccessDenial = (code: string): code is AccessDenial =>
  (ACCESS_DENIALS as readonly string[]).includes(code);

/**
 * The user of the last successful session check, which the expo plugin keeps
 * in SecureStore (cleared on sign-out). Used only while the server can't be
 * reached, so the app opens offline instead of showing the sign-in screen.
 */
function cachedSessionUser(): SessionUser | null {
  try {
    if (!authClient.getCookie()) return null;
    const raw = storageAdapter(SecureStore).getItem(`${AUTH_STORAGE_PREFIX}_session_data`);
    const cached = raw ? (JSON.parse(raw) as { user?: SessionUser } | null) : null;
    return cached?.user ?? null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = authClient.useSession();
  // No answer (offline) or a server error — not a 4xx, which means signed out.
  const status = (error as { status?: number } | null)?.status;
  const unreachable = !data && error != null && !(status && status >= 400 && status < 500);
  const offlineUser = useMemo(() => (unreachable ? cachedSessionUser() : null), [unreachable]);
  const user = data?.user ?? offlineUser;
  const userId = user?.id ?? null;
  const userIdRef = useRef<string | null>(null);
  const [denial, setDenial] = useState<AccessDenial | null>(null);
  // The session cookie cache can serve the old locale for up to 5 minutes
  // after a change, so the choice made on this device wins until sign-out.
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const signingOut = useRef(false);

  const endSession = useCallback(async ({ unregister }: { unregister: boolean }) => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      if (unregister) await unregisterPush();
      // The expo plugin clears the stored cookie before the request goes out,
      // so this signs out locally even when the server can't be reached.
      await authClient.signOut().catch(() => {});
      queryClient.clear();
      // Unsent ticks and the saved offline copy belong to this account only.
      await clearOutbox();
      if (userIdRef.current) forgetCache(userIdRef.current);
      setDenial(null);
      setLocaleOverride(null);
    } finally {
      signingOut.current = false;
    }
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
    if (!userId) return;
    void setOutboxUser(userId);
    return persistCacheFor(userId);
  }, [userId]);

  useEffect(() => {
    setApiErrorListener((error) => {
      // The session expired or was revoked (e.g. signed out on another device).
      if (error.status === 401) void endSession({ unregister: false });
      else if (error.status === 403 && isAccessDenial(error.code)) setDenial(error.code);
    });
    return () => setApiErrorListener(null);
  }, [endSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (!error) return { ok: true };
      return { ok: false, reason: error.status >= 400 && error.status < 500 ? "invalidCredentials" : "generic" };
    } catch {
      return { ok: false, reason: "generic" };
    }
  }, []);

  const setLocale = useCallback(async (locale: Locale) => {
    await api<LocaleResultDto>("/me/locale", { method: "PUT", body: { locale } });
    setLocaleOverride(locale);
    // Server texts (AI, plan labels) follow the new language.
    void queryClient.invalidateQueries();
  }, []);

  const value = useMemo<SessionValue>(() => {
    const blocked: Blocked | null = user?.mustChangePassword ? "MustChangePassword" : denial;
    return {
      user,
      isLoading: isPending,
      blocked: user ? blocked : null,
      locale: user ? (localeOverride ?? user.locale ?? null) : null,
      setLocale,
      signIn,
      signOut: () => endSession({ unregister: true }),
      retryAccess: () => {
        setDenial(null);
        void refetch(); // mustChangePassword lives on the session user
        void queryClient.invalidateQueries();
      },
    };
  }, [user, isPending, denial, localeOverride, setLocale, signIn, endSession, refetch]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
