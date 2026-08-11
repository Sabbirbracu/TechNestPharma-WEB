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
};

/** Mirrors `TokenResponse`; the refresh token never appears here — it is an
 *  httpOnly cookie scoped to /api/v1/auth (05-architecture §A4). */
type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Renew this many seconds before the access token actually expires. */
const REFRESH_SKEW_SECONDS = 60;

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
        const token = await apiFetch<TokenResponse>("/auth/refresh", {
          method: "POST",
          anonymous: true, // the cookie authenticates this call, not the token
        });
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
    async (email: string, password: string) => {
      const token = await apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        json: { email, password },
        anonymous: true,
      });
      beginSession(token);
      return token.user;
    },
    [beginSession],
  );

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
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Initials for the avatar chip — "Sabbir Ahmad" → "SA". */
export function initialsOf(user: AuthUser | null): string {
  if (!user) return "?";
  const parts = user.full_name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return user.email.charAt(0).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
