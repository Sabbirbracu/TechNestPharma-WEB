"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Client-side gate for the authenticated shell. The access token is memory-only
 * (05-architecture §A4), so the server cannot know whether a session exists —
 * the provider first tries the refresh cookie, and only a failed refresh sends
 * the visitor to /login. This is a UX redirect, not the security boundary; the
 * API rejects unauthorised requests regardless.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Sign-in is a modal on the landing page, not a route; `signin=1` tells
      // it to open itself and `next` sends the user on afterwards.
      const next = encodeURIComponent(pathname);
      router.replace(`/?signin=1&next=${next}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
