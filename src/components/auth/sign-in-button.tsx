"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoginDialog } from "@/components/auth/login-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Opens the sign-in modal. Replaces the old /login route.
 *
 * When `RequireAuth` bounces an unauthenticated visitor it sends them to
 * `/?signin=1&next=…`; the instance marked `autoOpen` picks that up and opens
 * itself, so a deep link still lands the user where they were headed.
 */
type SignInButtonProps = ButtonProps & {
  children?: ReactNode;
  autoOpen?: boolean;
};

/**
 * `useSearchParams` opts its subtree into client rendering, which would stop
 * the landing page prerendering — so the boundary lives here rather than in
 * every page that wants a sign-in button.
 */
export function SignInButton(props: SignInButtonProps) {
  const { children = "Sign in", autoOpen, ...buttonProps } = props;
  void autoOpen; // consumed by the inner component, not the fallback
  return (
    <Suspense
      fallback={
        <Button {...buttonProps} disabled>
          {children}
        </Button>
      }
    >
      <SignInButtonInner {...props} />
    </Suspense>
  );
}

function SignInButtonInner({
  children = "Sign in",
  autoOpen = false,
  ...buttonProps
}: SignInButtonProps) {
  const [clickedOpen, setClickedOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  // Derived, not set in an effect: the modal is open because the user clicked,
  // or because RequireAuth redirected here with ?signin=1 and it hasn't been
  // dismissed yet.
  const redirectedForSignIn =
    autoOpen &&
    searchParams.get("signin") === "1" &&
    status === "unauthenticated";
  const open = clickedOpen || (redirectedForSignIn && !dismissed);

  function close() {
    setClickedOpen(false);
    setDismissed(true);
  }

  // Already signed in? The button becomes a shortcut rather than a login prompt.
  if (status === "authenticated") {
    return (
      <Button {...buttonProps} onClick={() => router.push("/dashboard")}>
        Go to dashboard
      </Button>
    );
  }

  return (
    <>
      <Button {...buttonProps} onClick={() => setClickedOpen(true)}>
        {children}
      </Button>
      <LoginDialog open={open} onClose={close} next={next} />
    </>
  );
}
