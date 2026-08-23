"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";
import { BrandLockup } from "@/components/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const resetSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

/** Public route (outside the (app) group, so no RequireAuth/AppShell) that
 *  the password-reset email links to — sign-in itself stays a homepage
 *  modal, but a reset needs a real, bookmarkable/shareable URL to carry the
 *  token (core/email.py:_reset_password_html). */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  async function onSubmit(values: ResetValues) {
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        json: { token, new_password: values.password },
        anonymous: true,
      });
      setDone(true);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 429
            ? "Too many attempts. Please wait a while and try again."
            : error.message
          : "Could not reach the server. Is the API running?";
      setError("root", { message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/30 px-4 py-10">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/5 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-success to-primary" />

        <div className="px-8 pb-6 pt-10 text-center sm:px-10">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg">
            <Lock className="size-8" strokeWidth={2} />
          </div>
          <Link href="/" className="mb-4 inline-block transition-opacity hover:opacity-90">
            <BrandLockup className="justify-center" size="md" />
          </Link>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            {done ? "Password Reset" : token ? "Set a New Password" : "Invalid Link"}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {done
              ? "Sign in with your new password."
              : token
                ? "Choose a new password for your account."
                : "This reset link is missing its token — request a new one from the sign-in screen."}
          </p>
        </div>

        <div className="space-y-5 bg-card/50 px-8 py-8 sm:px-10">
          {done ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border-2 border-success/30 bg-gradient-to-br from-success/5 to-success/10 p-4 shadow-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="size-4" strokeWidth={2} />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    Your password has been changed. Every device you were signed in
                    on has been signed out for safety.
                  </p>
                </div>
              </div>
              <Link
                href="/?signin=1"
                className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base font-bold shadow-lg")}
              >
                Sign In
              </Link>
            </div>
          ) : !token ? (
            <Link
              href="/?signin=1"
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base font-bold shadow-lg")}
            >
              Back to Sign In
            </Link>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {errors.root && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-4 shadow-sm"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="size-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-destructive">{errors.root.message}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="reset-password" className="text-sm font-bold text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="h-12 pr-11"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" strokeWidth={2} />
                    ) : (
                      <Eye className="size-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertCircle className="size-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-confirm" className="text-sm font-bold text-foreground">
                  Confirm New Password
                </label>
                <Input
                  id="reset-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className="h-12"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertCircle className="size-3" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-base font-bold shadow-lg"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
