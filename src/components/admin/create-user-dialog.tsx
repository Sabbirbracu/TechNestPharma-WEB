"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Copy, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { useCreateUser } from "@/lib/queries";
import type { UserRole } from "@/types/api";

// Excludes 0/O/1/l/I — a temp password that's read aloud or typed off a
// screen shouldn't hinge on telling those apart.
const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 8): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join("");
}

type EmailFallback = { email: string; password: string };

/** Creates the account and emails the temp password (core/email.py, via
 *  Resend). If sending isn't configured or fails, the account is still
 *  created — the dialog then falls back to showing the password so the
 *  admin can share it directly instead of leaving them with nothing. */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [role, setRole] = useState<UserRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<EmailFallback | null>(null);

  const canSubmit = email.trim() && fullName.trim() && password.length >= 8;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const result = await createUser.mutateAsync({
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        role,
      });
      if (result.invite_email_sent) {
        toast.success(`Invite sent to ${result.email}`, { duration: 5000 });
        onClose();
      } else {
        setFallback({ email: result.email, password });
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not create this user");
    }
  }

  async function copyPassword() {
    if (!fallback) return;
    try {
      await navigator.clipboard.writeText(fallback.password);
      toast.success("Password copied");
    } catch {
      toast.error("Couldn't copy — select and copy the password manually");
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="size-[18px]" strokeWidth={2} />
          </span>
          <h2 id="create-user-title" className="flex-1 text-base font-bold text-foreground">
            {fallback ? "Account created" : "Add User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        {fallback ? (
          <div className="space-y-4 px-6 py-6">
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-foreground">
                {fallback.email} was created, but the invite email couldn&rsquo;t be
                sent. Share this password with them directly.
              </p>
            </div>
            <Field label="Temporary password">
              <div className="flex items-center gap-2">
                <Input value={fallback.password} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  aria-label="Copy password"
                  title="Copy password"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </Field>
            <div className="flex items-center justify-end border-t border-border/60 pt-5">
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-6 py-6">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <Field label="Full name">
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} autoFocus />
            </Field>
            <Field label="Email address">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Temporary password">
              <div className="flex items-center gap-2">
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generatePassword())}
                  aria-label="Generate new password"
                  title="Generate new password"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Auto-generated — we&rsquo;ll email it to them. Edit it if you&rsquo;d
                rather set your own.
              </p>
            </Field>
            <Field label="Role">
              <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="staff">Staff</option>
                <option value="viewer">Viewer — read only</option>
                <option value="owner">Owner — full access</option>
              </Select>
            </Field>

            <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-5">
              <Button type="button" variant="outline" onClick={onClose} disabled={createUser.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || createUser.isPending}>
                {createUser.isPending && <Loader2 className="animate-spin" />}
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
