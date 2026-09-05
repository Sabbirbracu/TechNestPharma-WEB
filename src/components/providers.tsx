"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { RateLimitBanner } from "./rate-limit-banner";

/**
 * Client-side providers. TanStack Query owns the read cache and optimistic
 * updates (05-architecture §A3). Auth failures (401) are not retried.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error instanceof ApiError) {
                if (error.status === 401) return false;
                // A throttle clears on its own, so one retry after the
                // server's own wait recovers the screen without the user
                // touching anything. Exactly one: the default backoff would
                // fire two more requests inside the same closed window and
                // deepen the hole it is trying to climb out of.
                if (error.status === 429) return failureCount < 1;
              }
              return failureCount < 2;
            },
            retryDelay: (failureCount, error) => {
              // The server said when to come back; guessing instead is how a
              // retry storm starts. Capped at a minute so a bad Retry-After
              // cannot strand the UI, and floored at a second so a limit that
              // has already expired retries promptly.
              if (error instanceof ApiError && error.retryAfterSeconds !== null) {
                const seconds = Math.min(Math.max(error.retryAfterSeconds, 1), 60);
                return seconds * 1000;
              }
              return Math.min(1000 * 2 ** failureCount, 30_000);
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      {/* Outside AuthProvider's subtree on purpose: a 429 on the login or
          refresh call has to be explainable too, and those happen before there
          is a session to render a page for. */}
      <RateLimitBanner />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 6000,
          style: {
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "0.625rem 0.875rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.25)",
          },
          success: {
            iconTheme: {
              primary: "var(--success)",
              secondary: "var(--success-foreground)",
            },
          },
        }}
      />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
