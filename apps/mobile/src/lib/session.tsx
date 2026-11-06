import type { LocaleResultDto } from "@fitmusc/shared/api/dto";
import { ACCESS_DENIALS, type AccessDenial } from "@fitmusc/shared/api/errors";
import type { Locale } from "@fitmusc/shared/locale";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { api, setApiErrorListener } from "./api";
import { authClient, type SessionUser } from "./auth-client";
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
  /** Shows the blocked screen right away, e.g. after withdrawing the KVKK data consent. */
  reportDenial: (code: AccessDenial) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const isAccessDenial = (code: string): code is AccessDenial =>
  (ACCESS_DENIALS as readonly string[]).includes(code);

export function SessionProvider({ children }: { children: ReactNode }) {
  // The expo plugin starts from the session it cached in SecureStore (until it
  // expires) and keeps it when a check fails without an answer, so the app
  // also opens offline; only a 401 or a sign-out clears it.
  const { data, isPending, refetch } = authClient.useSession();
  const user = data?.user ?? null;
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
      // The AI consent was withdrawn elsewhere (e.g. on the web): re-read it so
      // the next AI action asks again instead of failing.
      else if (error.code === "AI_CONSENT_REQUIRED") void queryClient.invalidateQueries({ queryKey: ["me.consents"] });
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
      reportDenial: setDenial,
    };
  }, [user, isPending, denial, localeOverride, setLocale, signIn, endSession, refetch]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
