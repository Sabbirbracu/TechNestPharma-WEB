"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useSignInDialog } from "@/components/auth/sign-in-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Trigger for the shared sign-in modal (see <SignInDialogProvider>). Every
 * instance on the page opens the same dialog — there is only ever one.
 */
type SignInButtonProps = ButtonProps & { children?: ReactNode };

export function SignInButton({
  children = "Sign in",
  ...buttonProps
}: SignInButtonProps) {
  const { status } = useAuth();
  const router = useRouter();
  const { openDialog } = useSignInDialog();

  // Already signed in? The button becomes a shortcut rather than a login prompt.
  if (status === "authenticated") {
    return (
      <Button {...buttonProps} onClick={() => router.push("/dashboard")}>
        Go to dashboard
      </Button>
    );
  }

  return (
    <Button {...buttonProps} onClick={openDialog}>
      {children}
    </Button>
  );
}
