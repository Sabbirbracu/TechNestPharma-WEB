"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoginDialog } from "@/components/auth/login-dialog";

type SignInDialogContextValue = {
  openDialog: () => void;
};

const SignInDialogContext = createContext<SignInDialogContextValue>({
  openDialog: () => {},
});

export function useSignInDialog() {
  return useContext(SignInDialogContext);
}

/**
 * Hosts the single sign-in modal shared by every trigger on the landing page
 * (header "Sign in", hero "Access Dashboard", …) so there is exactly one
 * <dialog> in the DOM — and one experience — no matter which button opened it.
 *
 * `openDialog` works immediately, unconditionally: the ?signin=1 deep-link
 * read (RequireAuth's redirect back here) needs useSearchParams(), which Next
 * requires a Suspense boundary for — but that boundary must NOT wrap
 * `children`/the dialog itself. Doing `<Suspense fallback={children}>` around
 * the whole provider (the previous shape here) rendered the *fallback*
 * indefinitely in practice: the real provider — and therefore the <dialog>
 * and a working `openDialog` — never mounted, so every "Sign in" button sat
 * permanently disabled (found 2026-08-12; no dialog element ever appeared in
 * the DOM). Isolating useSearchParams() to its own leaf keeps that one piece
 * async without gating manual sign-in on it ever resolving.
 */
export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [clickedOpen, setClickedOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deepLinkNext, setDeepLinkNext] = useState<string | null>(null);

  const openDialog = useCallback(() => setClickedOpen(true), []);
  const closeDialog = useCallback(() => {
    setClickedOpen(false);
    setDismissed(true);
  }, []);

  const redirectedForSignIn = deepLinkNext !== null && !dismissed;
  const open = clickedOpen || redirectedForSignIn;
  const next = deepLinkNext || "/dashboard";

  const value = useMemo(() => ({ openDialog }), [openDialog]);

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      {/* Reads ?signin=1&next=… to auto-open after RequireAuth's redirect.
          Suspense only wraps this sliver — never the dialog or the button
          triggers — so it cannot block manual sign-in from working. */}
      <Suspense fallback={null}>
        <DeepLinkWatcher onDetect={setDeepLinkNext} />
      </Suspense>
      <LoginDialog open={open} onClose={closeDialog} next={next} />
    </SignInDialogContext.Provider>
  );
}

function DeepLinkWatcher({
  onDetect,
}: {
  onDetect: (next: string) => void;
}) {
  const { status } = useAuth();
  const searchParams = useSearchParams();
  const isDeepLink = searchParams.get("signin") === "1";
  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (isDeepLink && status === "unauthenticated") {
      onDetect(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetect is a stable setState
  }, [isDeepLink, status, next]);

  return null;
}
