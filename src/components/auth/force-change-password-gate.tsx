"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forceChangeSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ForceChangeValues = z.infer<typeof forceChangeSchema>;

/**
 * Wraps the authenticated app shell (mounted in (app)/layout.tsx, inside
 * RequireAuth) and replaces it outright with a mandatory password-change
 * screen whenever `user.must_change_password` is true — an admin-created
 * account still on the temp password an admin set or generated. There is no
 * dismiss/skip path: AppShell simply never renders until the change succeeds
 * (SRS FR-AUTH extension, 2026-08-23).
 */
export function ForceChangePasswordGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.must_change_password) {
    return <ForceChangePasswordScreen />;
  }
  return <>{children}</>;
}

function ForceChangePasswordScreen() {
  const { updateUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForceChangeValues>({ resolver: zodResolver(forceChangeSchema) });

  async function onSubmit(values: ForceChangeValues) {
    try {
      await apiFetch("/auth/force-change-password", {
        method: "POST",
        json: { new_password: values.password },
      });
      updateUser({ must_change_password: false });
      toast.success(
        "Password updated. Use your new password next time — not the temporary one you signed in with.",
        { duration: 6000 },
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
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
            <ShieldAlert className="size-8" strokeWidth={2} />
          </div>
          <BrandLockup className="mb-4 justify-center" size="md" />
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            Change Your Password
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            You signed in with a temporary password. Set your own to continue —
            from next time, use this new password to sign in.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 bg-card/50 px-8 py-8 sm:px-10"
        >
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
            <label htmlFor="force-new-password" className="text-sm font-bold text-foreground">
              New Password
            </label>
            <div className="relative">
              <Input
                id="force-new-password"
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
            <label htmlFor="force-confirm-password" className="text-sm font-bold text-foreground">
              Confirm New Password
            </label>
            <Input
              id="force-confirm-password"
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
            {isSubmitting ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
