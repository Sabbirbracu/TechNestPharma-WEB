"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  SlidersHorizontal,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/auth";
import {
  useChangePassword,
  useUpdateNotificationPreferences,
  useUpdateProfile,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TwoFactorCard } from "./two-factor-card";
import { SessionsCard } from "./sessions-card";
import { AvatarCard } from "./avatar-card";

/** Sentence-case the role enum for display, same map the sidebar uses. */
const ROLE_LABEL: Record<string, string> = {
  owner: "Full access",
  staff: "Staff",
  viewer: "Read only",
};

type TabKey = "account" | "security" | "notifications" | "preferences" | "system";

const TABS: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { key: "account", label: "Account", description: "Profile and account details", icon: User },
  { key: "security", label: "Security", description: "Password, 2FA & sessions", icon: Shield },
  { key: "notifications", label: "Notifications", description: "Email preferences", icon: Bell },
  {
    key: "preferences",
    label: "Preferences",
    description: "Application settings",
    icon: SlidersHorizontal,
  },
  { key: "system", label: "System", description: "Data, import & export", icon: Database },
];

/**
 * One tab visible at a time, left rail to switch (SRS FR-AUTH extension,
 * 2026-08-23). Only Account, Security, and Notifications back real settings;
 * Preferences and System are kept as honest placeholders rather than fake
 * controls, since nothing in the app reads a theme, locale, or export
 * preference yet.
 */
export function SettingsWorkspace() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("account");

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Manage your account, security, and application preferences.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="space-y-1.5">
          {TABS.map((entry) => (
            <TabButton
              key={entry.key}
              active={tab === entry.key}
              label={entry.label}
              description={entry.description}
              icon={entry.icon}
              onClick={() => setTab(entry.key)}
            />
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          {tab === "account" && (
            <>
              <AvatarCard user={user} />
              <ProfileCard
                fullName={user?.full_name ?? ""}
                email={user?.email ?? ""}
                role={user?.role}
              />
            </>
          )}
          {tab === "security" && (
            <>
              <PasswordCard />
              <TwoFactorCard />
              <SessionsCard />
            </>
          )}
          {tab === "notifications" && (
            <NotificationsCard
              followUpDue={user?.notify_follow_up_due ?? true}
              quotationReceived={user?.notify_quotation_received ?? true}
            />
          )}
          {tab === "preferences" && (
            <EmptyState
              icon={SlidersHorizontal}
              title="No application preferences yet"
              description="Things like theme, language, and date format aren't built into the app yet — there's nothing here to configure until they are."
            />
          )}
          {tab === "system" && (
            <EmptyState
              icon={Database}
              title="No account-level data tools yet"
              description="Bulk data import already lives on its own page. There's no whole-account export yet — Tenders and Sourcing each have their own CSV export in the meantime."
            >
              <Link href="/imports" className="text-sm font-bold text-primary hover:text-primary/80">
                Go to Import →
              </Link>
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab list                                                                    */
/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3.5 py-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/[0.06]"
          : "border-transparent hover:bg-accent/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors",
          active
            ? "bg-primary/15 text-primary ring-primary/20"
            : "bg-secondary text-muted-foreground ring-border/60",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-bold",
            active ? "text-foreground" : "text-foreground/80",
          )}
        >
          {label}
        </span>
        <span className="block truncate text-xs font-medium text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared card + field shells                                                 */
/* -------------------------------------------------------------------------- */

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

function ProfileCard({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string | undefined;
}) {
  const [name, setName] = useState(fullName);
  const updateProfile = useUpdateProfile();

  const dirty = name.trim() !== fullName.trim();

  async function save() {
    if (!name.trim()) return;
    try {
      await updateProfile.mutateAsync(name.trim());
      toast.success("Profile updated", { duration: 5000 });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save your name");
    }
  }

  return (
    <SettingsCard icon={User} title="Profile" description="Your name and account details">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email address">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-secondary/40 px-4 text-sm font-medium text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        </Field>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <span className="text-xs font-semibold text-muted-foreground">
          Role: {role ? (ROLE_LABEL[role] ?? role) : "—"}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!dirty || !name.trim() || updateProfile.isPending}
        >
          {updateProfile.isPending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </div>
    </SettingsCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Password                                                                    */
/* -------------------------------------------------------------------------- */

/** A password `Input` with a show/hide toggle, tighter corners than the
 *  default field (`rounded-lg` vs. `rounded-xl`). */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("rounded-lg pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? (
          <EyeOff className="size-4" strokeWidth={2} />
        ) : (
          <Eye className="size-4" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

function PasswordCard() {
  const { logout } = useAuth();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed — please sign in again", { duration: 6000 });
      await logout();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not change your password");
    }
  }

  return (
    <SettingsCard
      icon={KeyRound}
      title="Password"
      description="Changing your password signs you out of every device"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}
        <Field label="Current password">
          <PasswordInput
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <PasswordInput
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {tooShort && (
              <p className="text-[11px] font-medium text-destructive">At least 8 characters</p>
            )}
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {mismatch && (
              <p className="text-[11px] font-medium text-destructive">Passwords don&rsquo;t match</p>
            )}
          </Field>
        </div>
        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button type="submit" size="sm" disabled={!canSubmit || changePassword.isPending}>
            {changePassword.isPending && <Loader2 className="animate-spin" />}
            Change password
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Notification preferences                                                    */
/* -------------------------------------------------------------------------- */

function NotificationsCard({
  followUpDue,
  quotationReceived,
}: {
  followUpDue: boolean;
  quotationReceived: boolean;
}) {
  const [followUp, setFollowUp] = useState(followUpDue);
  const [quotation, setQuotation] = useState(quotationReceived);
  const updatePrefs = useUpdateNotificationPreferences();

  const dirty = followUp !== followUpDue || quotation !== quotationReceived;

  async function save() {
    try {
      await updatePrefs.mutateAsync({
        notify_follow_up_due: followUp,
        notify_quotation_received: quotation,
      });
      toast.success("Notification preferences saved", { duration: 5000 });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save preferences");
    }
  }

  return (
    <SettingsCard
      icon={Bell}
      title="Notifications"
      description="Choose what you'd want to be emailed about"
    >
      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        <Checkbox checked={followUp} onChange={() => setFollowUp((v) => !v)} />
        Follow-up reminders for open sourcing enquiries
      </label>
      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        <Checkbox checked={quotation} onChange={() => setQuotation((v) => !v)} />
        A supplier sends a new quotation
      </label>
      <p className="rounded-lg bg-secondary/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
        These preferences are saved, but automated email sending isn&rsquo;t built yet — no
        emails go out from either toggle right now.
      </p>
      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button type="button" size="sm" onClick={save} disabled={!dirty || updatePrefs.isPending}>
          {updatePrefs.isPending && <Loader2 className="animate-spin" />}
          Save preferences
        </Button>
      </div>
    </SettingsCard>
  );
}
