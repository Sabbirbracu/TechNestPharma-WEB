"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, X, Lock, Eye, EyeOff } from "lucide-react";
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
 * Premium sign-in modal on the landing page (FR-AUTH).
 * Built on native <dialog> for platform focus trapping and Esc-to-close.
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
  const [showPassword, setShowPassword] = useState(false);

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
      setShowPassword(false);
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
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="login-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md border-0"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/5">
        {/* Premium gradient header bar */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-success to-primary"></div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground hover:scale-105"
        >
          <X className="size-5" strokeWidth={2} />
        </button>

        {/* Header Section */}
        <div className="px-8 pb-6 pt-10 text-center sm:px-10">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg">
            <Lock className="size-8" strokeWidth={2} />
          </div>
          <BrandLockup className="mb-4 justify-center" size="md" />
          <h2 id="login-dialog-title" className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            Sign in to access your sourcing dashboard
          </p>
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 bg-card/50 px-8 py-8 sm:px-10"
          noValidate
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
            <label htmlFor="login-email" className="text-sm font-bold text-foreground">
              Email Address
            </label>
            <Input
              id="login-email"
              type="email"
              autoFocus
              autoComplete="username"
              placeholder="your.email@company.com"
              className="h-12"
              {...register("email")}
            />
            {errors.email && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertCircle className="size-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-bold text-foreground">
              Password
            </label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
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

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-bold shadow-lg" 
            size="lg" 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>

          <div className="rounded-lg bg-muted/50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              🔒 Secure access · Accounts managed by your administrator
            </p>
          </div>
        </form>
      </div>
    </dialog>
  );
}
