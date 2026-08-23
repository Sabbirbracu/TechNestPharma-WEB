"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, X, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function randomCaptcha() {
  return { a: 1 + Math.floor(Math.random() * 9), b: 1 + Math.floor(Math.random() * 9) };
}

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
  const { login, verifyLogin } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Set only when the account has two-step verification on — the credentials
  // form hands off to a second, single-field step rather than closing.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // "Forgot password" swaps the same dialog into a request form, then a
  // confirmation — no second <dialog> stacked on top, same pattern as the
  // MFA step above.
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [captcha, setCaptcha] = useState(randomCaptcha);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  function openForgot() {
    setShowForgot(true);
    setForgotSent(false);
    setForgotEmail("");
    setCaptcha(randomCaptcha());
    setCaptchaAnswer("");
    setForgotError(null);
  }

  async function onForgotSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!forgotEmail.trim()) return;
    if (Number(captchaAnswer) !== captcha.a + captcha.b) {
      setForgotError("That's not quite right — try again.");
      setCaptcha(randomCaptcha());
      setCaptchaAnswer("");
      return;
    }
    setForgotError(null);
    setForgotSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        json: { email: forgotEmail.trim() },
        anonymous: true,
      });
      setForgotSent(true);
    } catch (error) {
      setForgotError(
        error instanceof ApiError
          ? error.status === 429
            ? "Too many attempts. Please wait a while and try again."
            : error.message
          : "Could not reach the server. Is the API running?",
      );
      setCaptcha(randomCaptcha());
      setCaptchaAnswer("");
    } finally {
      setForgotSubmitting(false);
    }
  }

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
      setMfaToken(null);
      setCode("");
      setVerifyError(null);
      setShowForgot(false);
      setForgotSent(false);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  async function onSubmit(values: LoginValues) {
    try {
      const result = await login(values.email, values.password);
      if (result.status === "mfa_required") {
        setMfaToken(result.mfaToken);
        return;
      }
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

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!mfaToken || !code.trim()) return;
    setVerifyError(null);
    setVerifying(true);
    try {
      await verifyLogin(mfaToken, code.trim());
      onClose();
      router.push(next);
    } catch (error) {
      setVerifyError(
        error instanceof ApiError
          ? error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : error.message
          : "Could not reach the server. Is the API running?",
      );
    } finally {
      setVerifying(false);
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
            {mfaToken
              ? "Two-Step Verification"
              : showForgot
                ? forgotSent
                  ? "Check Your Email"
                  : "Reset Password"
                : "Welcome Back"}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {mfaToken
              ? "Enter the code from your authenticator app"
              : showForgot
                ? forgotSent
                  ? "If that account exists, a reset link is on its way"
                  : "Enter your email and we'll send you a reset link"
                : "Sign in to access your sourcing dashboard"}
          </p>
        </div>

        {mfaToken ? (
          <form
            onSubmit={onVerify}
            className="space-y-5 bg-card/50 px-8 py-8 sm:px-10"
            noValidate
          >
            {verifyError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-4 shadow-sm"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="size-4" strokeWidth={2} />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-destructive">{verifyError}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-mfa-code" className="text-sm font-bold text-foreground">
                Verification code
              </label>
              <Input
                id="login-mfa-code"
                type="text"
                inputMode="text"
                autoFocus
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-12 text-center text-lg tracking-[0.3em]"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <p className="text-xs font-medium text-muted-foreground">
                Lost your device? A recovery code works here too.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-lg"
              size="lg"
              disabled={verifying || !code.trim()}
            >
              {verifying && <Loader2 className="animate-spin" />}
              {verifying ? "Verifying..." : "Verify"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMfaToken(null);
                setCode("");
                setVerifyError(null);
                reset();
              }}
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          </form>
        ) : showForgot ? (
          forgotSent ? (
            <div className="space-y-5 bg-card/50 px-8 py-8 sm:px-10">
              <div className="flex items-start gap-3 rounded-xl border-2 border-success/30 bg-gradient-to-br from-success/5 to-success/10 p-4 shadow-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="size-4" strokeWidth={2} />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    If an account exists for <strong>{forgotEmail.trim()}</strong>, we
                    just emailed a link to reset the password. It expires in an hour.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="w-full h-12 text-base font-bold shadow-lg"
                size="lg"
                onClick={() => setShowForgot(false)}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form
              onSubmit={onForgotSubmit}
              className="space-y-5 bg-card/50 px-8 py-8 sm:px-10"
              noValidate
            >
              {forgotError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-4 shadow-sm"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="size-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-destructive">{forgotError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-sm font-bold text-foreground">
                  Email Address
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  placeholder="your.email@company.com"
                  className="h-12"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="forgot-captcha" className="text-sm font-bold text-foreground">
                  What is {captcha.a} + {captcha.b}?
                </label>
                <Input
                  id="forgot-captcha"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Your answer"
                  className="h-12"
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-lg"
                size="lg"
                disabled={forgotSubmitting || !forgotEmail.trim() || !captchaAnswer.trim()}
              >
                {forgotSubmitting && <Loader2 className="animate-spin" />}
                {forgotSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
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
            <div className="text-right">
              <button
                type="button"
                onClick={openForgot}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
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
        )}
      </div>
    </dialog>
  );
}
