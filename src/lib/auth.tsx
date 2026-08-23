"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiFetch,
  setAccessToken,
  setRefreshHandler,
  ApiError,
} from "@/lib/api";
import type { UserRole } from "@/types/domain";

/** Mirrors `UserOut` in backend/app/schemas/auth.py. */
export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  avatar_url: string | null;
  two_factor_enabled: boolean;
  notify_follow_up_due: boolean;
  notify_quotation_received: boolean;
  /** True for an admin-created account still on its temp password — the
   *  forced first-login screen (force-change-password-gate.tsx) blocks the
   *  whole app shell until this clears. */
  must_change_password: boolean;
};

/** Mirrors `TokenResponse`; the refresh token never appears here — it is an
 *  httpOnly cookie scoped to /api/v1/auth (05-architecture §A4). */
type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

/** Mirrors `LoginChallenge` — returned by `login()` in place of a user when
 *  the account has two-step verification on (Settings, 2026-08-22). */
type LoginChallenge = {
  mfa_required: true;
  mfa_token: string;
  expires_in: number;
};

export type LoginResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "mfa_required"; mfaToken: string };

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Completes a two-step login: `code` is a TOTP or a recovery code. */
  verifyLogin: (mfaToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Patches the cached user in place after a Settings change (name, 2FA
   *  toggle, notification prefs) — avoids a round trip through /auth/me just
   *  to reflect what the caller already knows just succeeded. */
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Renew this many seconds before the access token actually expires. */
const REFRESH_SKEW_SECONDS = 60;

/**
 * Refresh tokens rotate on every use, and the backend treats a replayed
 * (already-rotated) cookie as theft — it revokes the whole session, not just
 * that request (services/auth.py). The refresh cookie is shared browser-wide,
 * so with several tabs open, a reload that hits all of them at once (e.g. a
 * dev-server Fast Refresh full reload) makes each tab's bootstrap fire its own
 * /auth/refresh with the same pre-rotation cookie — the second one to land
 * gets treated as reuse and kills every tab's session.
 *
 * The Web Locks API serializes the actual network call across tabs: whichever
 * tab runs second waits its turn, and by then the browser has already applied
 * the first tab's Set-Cookie, so its request carries the *new* cookie instead
 * of racing on the stale one. Falls back to running unlocked where Web Locks
 * isn't available (e.g. older Safari).
 */
const REFRESH_LOCK_NAME = "pharmasourcing-erp:auth-refresh";

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return fn();
  // lib.dom's LockManager.request types don't unwrap a Promise-returning
  // callback (it infers T = Promise<T> here), though at runtime it awaits the
  // callback and resolves with the unwrapped value per spec.
  return navigator.locks.request(REFRESH_LOCK_NAME, fn) as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const queryClient = useQueryClient();

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The single in-flight refresh. Refresh tokens rotate, and replaying a
   * consumed one makes the backend revoke the whole family as suspected theft
   * (services/auth.py). Concurrent 401s — and React's double-invoked effects in
   * development — must therefore share one request, never race.
   */
  const inFlightRefresh = useRef<Promise<boolean> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const endSession = useCallback(() => {
    clearTimer();
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [clearTimer]);

  // `scheduleRefresh` and `beginSession` are mutually recursive; a ref breaks
  // the cycle without recreating either callback on every render.
  const refreshRef = useRef<() => Promise<boolean>>(async () => false);

  const scheduleRefresh = useCallback(
    (expiresInSeconds: number) => {
      clearTimer();
      const delayMs =
        Math.max(expiresInSeconds - REFRESH_SKEW_SECONDS, 30) * 1000;
      refreshTimer.current = setTimeout(() => {
        void refreshRef.current();
      }, delayMs);
    },
    [clearTimer],
  );

  const beginSession = useCallback(
    (token: TokenResponse) => {
      setAccessToken(token.access_token);
      setUser(token.user);
      setStatus("authenticated");
      scheduleRefresh(token.expires_in);
    },
    [scheduleRefresh],
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;

    const attempt = (async () => {
      try {
        const token = await runExclusive(() =>
          apiFetch<TokenResponse>("/auth/refresh", {
            method: "POST",
            anonymous: true, // the cookie authenticates this call, not the token
          }),
        );
        beginSession(token);
        return true;
      } catch {
        endSession();
        return false;
      } finally {
        inFlightRefresh.current = null;
      }
    })();

    inFlightRefresh.current = attempt;
    return attempt;
  }, [beginSession, endSession]);

  // Publish the current `refresh` to both the scheduled-renewal ref and the API
  // client. Safe to do in an effect: the renewal timer is minutes away, so it
  // cannot fire before this has run.
  useEffect(() => {
    refreshRef.current = refresh;
    setRefreshHandler(refresh);
    return () => setRefreshHandler(null);
  }, [refresh]);

  // Restore the session on load: the access token is memory-only, so a reload
  // starts with nothing and the refresh cookie is the only way back in.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => clearTimer, [clearTimer]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await apiFetch<TokenResponse | LoginChallenge>(
        "/auth/login",
        { method: "POST", json: { email, password }, anonymous: true },
      );
      if ("mfa_required" in result) {
        return { status: "mfa_required", mfaToken: result.mfa_token };
      }
      beginSession(result);
      return { status: "authenticated", user: result.user };
    },
    [beginSession],
  );

  const verifyLogin = useCallback(
    async (mfaToken: string, code: string) => {
      const token = await apiFetch<TokenResponse>("/auth/login/verify", {
        method: "POST",
        json: { mfa_token: mfaToken, code },
        anonymous: true,
      });
      beginSession(token);
      return token.user;
    },
    [beginSession],
  );

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (error) {
      // A dead session is still a successful logout from the user's side.
      if (!(error instanceof ApiError)) throw error;
    } finally {
      endSession();
      queryClient.clear(); // never leak one account's cache into the next
    }
  }, [endSession, queryClient]);

  const value = useMemo(
    () => ({ user, status, login, verifyLogin, logout, updateUser }),
    [user, status, login, verifyLogin, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Initials for the avatar chip — "Sabbir Ahmad" → "SA". */
/** Only the fields an avatar actually needs — lets `UserAvatar` render an
 *  `AdminUser` row (admin/users-workspace.tsx) as easily as the signed-in
 *  `AuthUser`, without fabricating the fields that are only ever true for
 *  "yourself" (2FA state, notification prefs). */
export type AvatarSubject = Pick<AuthUser, "full_name" | "email" | "avatar_url">;

export function initialsOf(user: AvatarSubject | null): string {
  if (!user) return "?";
  const parts = user.full_name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return user.email.charAt(0).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
