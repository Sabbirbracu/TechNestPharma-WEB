"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useSetupTwoFactor,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Field, SettingsCard } from "./settings-workspace";

type Step = "idle" | "setup" | "recovery" | "disable";

/**
 * Enrollment is two calls on purpose (setup, then confirm): a secret the user
 * never actually scans right must not silently gate their next login, so
 * `two_factor_enabled` only flips once a real code from the app checks out.
 */
export function TwoFactorCard() {
  const { user } = useAuth();
  const enabled = user?.two_factor_enabled ?? false;
  const [step, setStep] = useState<Step>("idle");

  const setup = useSetupTwoFactor();
  const confirm = useConfirmTwoFactor();
  const disable = useDisableTwoFactor();

  const [code, setCode] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedCodes, setSavedCodes] = useState(false);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);

  async function startSetup() {
    setConfirmError(null);
    setCode("");
    try {
      await setup.mutateAsync();
      setStep("setup");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not start setup");
    }
  }

  async function confirmSetup(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setConfirmError(null);
    try {
      const result = await confirm.mutateAsync(code.trim());
      setRecoveryCodes(result.codes);
      setSavedCodes(false);
      setStep("recovery");
    } catch (error) {
      setConfirmError(error instanceof ApiError ? error.message : "Could not confirm the code");
    }
  }

  function finishEnrollment() {
    setStep("idle");
    setRecoveryCodes([]);
    setCode("");
  }

  async function confirmDisable(event: React.FormEvent) {
    event.preventDefault();
    if (!disablePassword) return;
    setDisableError(null);
    try {
      await disable.mutateAsync(disablePassword);
      toast.success("Two-step verification turned off", { duration: 5000 });
      setStep("idle");
      setDisablePassword("");
    } catch (error) {
      setDisableError(
        error instanceof ApiError ? error.message : "Could not turn off two-step verification",
      );
    }
  }

  function copyCodes() {
    navigator.clipboard?.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied", { duration: 4000 });
  }

  return (
    <SettingsCard
      icon={ShieldCheck}
      title="Two-Step Verification"
      description="Require a code from an authenticator app when signing in"
    >
      {step === "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
              enabled
                ? "bg-success/10 text-success ring-success/20"
                : "bg-secondary text-secondary-foreground ring-border/60",
            )}
          >
            <span className={cn("size-1.5 rounded-full", enabled ? "bg-success" : "bg-muted-foreground")} />
            {enabled ? "Turned on" : "Turned off"}
          </span>
          {enabled ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setStep("disable")}>
              Turn off
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={startSetup} disabled={setup.isPending}>
              {setup.isPending && <Loader2 className="animate-spin" />}
              Enable two-step verification
            </Button>
          )}
        </div>
      )}

      {step === "setup" && setup.data && (
        <form onSubmit={confirmSetup} className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, not a remote asset Next can optimise */}
            <img
              src={setup.data.qr_data_uri}
              alt="Scan this QR code with your authenticator app"
              className="size-36 shrink-0 rounded-lg border border-border/60 bg-white p-2"
            />
            <div className="min-w-0 space-y-1.5 text-center sm:text-left">
              <p className="text-xs font-semibold text-foreground">
                Scan with Google Authenticator, Authy, or similar
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                Can&rsquo;t scan? Enter this code manually:
              </p>
              <code className="block truncate rounded-lg bg-card px-2.5 py-1.5 font-mono text-xs font-bold text-foreground ring-1 ring-border/60">
                {setup.data.secret}
              </code>
            </div>
          </div>

          {confirmError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">{confirmError}</p>
            </div>
          )}

          <Field label="Enter the 6-digit code from your app">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              autoFocus
              className="max-w-[180px] text-center text-lg tracking-[0.3em]"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("idle")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!code.trim() || confirm.isPending}>
              {confirm.isPending && <Loader2 className="animate-spin" />}
              Confirm
            </Button>
          </div>
        </form>
      )}

      {step === "recovery" && (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-tile-amber/30 bg-tile-amber-bg p-3"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-tile-amber" />
            <p className="text-sm font-medium text-foreground">
              Save these recovery codes now — each works once, to get back in if you lose your
              authenticator device. They won&rsquo;t be shown again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-secondary/30 p-4 font-mono text-sm font-bold text-foreground sm:grid-cols-4">
            {recoveryCodes.map((recoveryCode) => (
              <span key={recoveryCode}>{recoveryCode}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={copyCodes}>
              <Copy className="size-3.5" strokeWidth={2.25} />
              Copy codes
            </Button>
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                checked={savedCodes}
                onChange={(event) => setSavedCodes(event.target.checked)}
              />
              I&rsquo;ve saved these codes somewhere safe
            </label>
            <Button type="button" size="sm" onClick={finishEnrollment} disabled={!savedCodes}>
              <Check className="size-3.5" strokeWidth={2.5} />
              Done
            </Button>
          </div>
        </div>
      )}

      {step === "disable" && (
        <form onSubmit={confirmDisable} className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Enter your current password to turn off two-step verification.
          </p>
          {disableError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">{disableError}</p>
            </div>
          )}
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(event) => setDisablePassword(event.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("idle");
                setDisablePassword("");
                setDisableError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!disablePassword || disable.isPending}
            >
              {disable.isPending && <Loader2 className="animate-spin" />}
              Turn off
            </Button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
