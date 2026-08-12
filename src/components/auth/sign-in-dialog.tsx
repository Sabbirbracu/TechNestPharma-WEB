"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoginDialog } from "@/components/auth/login-dialog";

type SignInDialogContextValue = {
  openDialog: () => void;
  /** False until the deep-link (`?signin=1`) state has resolved client-side. */
  ready: boolean;
};

const SignInDialogContext = createContext<SignInDialogContextValue>({
  openDialog: () => {},
  ready: false,
});

export function useSignInDialog() {
  return useContext(SignInDialogContext);
}

/**
 * Hosts the single sign-in modal shared by every trigger on the landing page
 * (header "Sign in", hero "Access Dashboard", …) so there is exactly one
 * <dialog> in the DOM — and one experience — no matter which button opened it.
 */
export function SignInDialogProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <SignInDialogProviderInner>{children}</SignInDialogProviderInner>
    </Suspense>
  );
}

function SignInDialogProviderInner({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [clickedOpen, setClickedOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // RequireAuth bounces unauthenticated visitors here as /?signin=1&next=…;
  // open automatically unless this session has already dismissed it once.
  const redirectedForSignIn =
    searchParams.get("signin") === "1" && status === "unauthenticated";
  const open = clickedOpen || (redirectedForSignIn && !dismissed);

  const openDialog = useCallback(() => setClickedOpen(true), []);
  const closeDialog = useCallback(() => {
    setClickedOpen(false);
    setDismissed(true);
  }, []);

  const value = useMemo(() => ({ openDialog, ready: true }), [openDialog]);

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      <LoginDialog open={open} onClose={closeDialog} next={next} />
    </SignInDialogContext.Provider>
  );
}
