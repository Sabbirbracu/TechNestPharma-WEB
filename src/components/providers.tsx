"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";

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
              if (error instanceof ApiError && error.status === 401) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
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
