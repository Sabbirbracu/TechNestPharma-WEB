"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Sign-in as a modal on the landing page (FR-AUTH) — there is no /login route.
 *
 * Built on the native <dialog> element so focus trapping, Esc-to-close, inert
 * background, and the top-layer stacking come from the platform rather than
 * from a dependency.
 */
export function LoginDialog({
  open,
  onClose,
  next = "/dashboard",
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Drive the native dialog from React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  async function onSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password);
      onClose();
      router.push(next);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : error.message
          : "Could not reach the server. Is the API running?";
      setError("root", { message });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      // `close` also fires on Esc and on the backdrop-click handler below.
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="login-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-foreground/40 backdrop:backdrop-blur-sm"
    >
      <div className="relative overflow-hidden rounded-xl">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-hover to-primary" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center gap-1.5 px-6 pb-4 pt-7 text-center">
          <BrandLockup className="mb-2" />
          <h2 id="login-dialog-title" className="text-xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in to the sourcing catalogue
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 px-6 pb-6"
          noValidate
        >
          {errors.root && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              // Without this the dialog's default focus lands on the close
              // button, which reads as "dismiss" rather than "start typing".
              autoFocus
              autoComplete="username"
              placeholder="owner@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Accounts are created by your administrator.
          </p>
        </form>
      </div>
    </dialog>
  );
}
