"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SettingsCard } from "@/components/settings/settings-workspace";
import {
  useConnectMailbox,
  useDisconnectMailbox,
  useMailboxSettings,
  useSyncMailbox,
  useUpdateMailboxName,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Connect and monitor the Gmail account supplier inquiries are sent from.
 *
 * Not the same thing as the notification settings elsewhere on this screen.
 * Those go out through Resend as the product — invites, password resets. This
 * is the client's own address, sending as a person, and expecting replies.
 *
 * The card's main job is making the weekly re-authorisation legible. Google
 * expires refresh tokens after 7 days on a Testing-mode OAuth app against a
 * consumer @gmail.com address, so "connected" is a state with a shelf life —
 * and a countdown the buyer can see beats a send that fails on a Monday
 * morning with no explanation.
 */
export function MailboxConnectionCard() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const { data, isPending } = useMailboxSettings();
  const connect = useConnectMailbox();
  const disconnect = useDisconnectMailbox();
  const sync = useSyncMailbox();

  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  // The OAuth callback is a top-level browser navigation back to this page,
  // so its outcome arrives as a query string rather than a mutation result.
  useOAuthResultToast();

  if (isPending) {
    return (
      <SettingsCard
        icon={Mail}
        title="Email Config"
        description="The Gmail account supplier inquiries are sent from"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Checking connection…
        </div>
      </SettingsCard>
    );
  }

  const account = data?.account ?? null;
  const needsReauth = account?.status === "needs_reauth";
  const connected = account?.status === "connected";

  return (
    <SettingsCard
      icon={Mail}
      title="Email Config"
      description="The Gmail account supplier inquiries are sent from"
    >
      {!data?.configured && (
        <Notice tone="warning" icon={AlertTriangle}>
          Gmail is not configured on the server. Set <code>GMAIL_CLIENT_ID</code>{" "}
          and <code>GMAIL_CLIENT_SECRET</code>, then restart the API.
        </Notice>
      )}

      {data?.configured && !data.tokens_encrypted && (
        <Notice tone="warning" icon={ShieldAlert}>
          <code>MAILBOX_TOKEN_KEY</code> is not set, so the Gmail refresh token
          is stored unencrypted. Fine for local testing; set a key before
          connecting a real mailbox.
        </Notice>
      )}

      {needsReauth && (
        <Notice tone="warning" icon={AlertTriangle}>
          <span className="font-bold">Reconnect needed.</span>{" "}
          {account?.last_sync_error ??
            "The Gmail authorisation has expired."}{" "}
          This is expected roughly weekly while the Google app is in Testing
          mode — reconnecting takes a few seconds and nothing is lost.
        </Notice>
      )}

      {account ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
                  connected
                    ? "bg-success/10 text-success ring-success/20"
                    : "bg-warning/10 text-warning ring-warning/20",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    connected ? "bg-success" : "bg-warning",
                  )}
                />
                {connected ? "Connected" : "Needs reconnecting"}
              </span>
              <p className="mt-2 truncate font-mono text-xs font-semibold text-foreground">
                {account.email_address}
              </p>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending || !connected}
                >
                  {sync.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  Sync now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={needsReauth ? "default" : "outline"}
                  onClick={() => connect.mutate()}
                  disabled={connect.isPending || !data?.configured}
                >
                  {connect.isPending && <Loader2 className="animate-spin" />}
                  {needsReauth ? "Reconnect" : "Re-authorise"}
                </Button>
              </div>
            )}
          </div>

          {/* The countdown is the point of showing connected_at at all. */}
          {connected && data?.days_until_reauth !== null && (
            <p className="text-[11px] font-medium text-muted-foreground">
              Authorisation expires in{" "}
              <span className="font-bold text-foreground">
                {data?.days_until_reauth === 0
                  ? "less than a day"
                  : `${data?.days_until_reauth} day${data?.days_until_reauth === 1 ? "" : "s"}`}
              </span>
              . Google limits Testing-mode apps to 7 days; reconnect any time to
              reset it.
            </p>
          )}

          {account.last_synced_at && (
            <p className="text-[11px] font-medium text-muted-foreground">
              Last synced {new Date(account.last_synced_at).toLocaleString()}
            </p>
          )}

          {isOwner && (
            /* Its own component, keyed by the account, so the input seeds from
               a `useState` initialiser rather than an effect that syncs props
               into state — and a background refetch cannot clobber an edit in
               progress. */
            <SenderNameForm
              key={account.id}
              initialName={account.display_name ?? ""}
            />
          )}

          {isOwner && (
            <div className="border-t border-border/60 pt-4">
              {confirmingDisconnect ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Disconnect {account.email_address}? Messages already synced
                    are kept.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmingDisconnect(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      disconnect.mutate(undefined, {
                        onSuccess: () => {
                          setConfirmingDisconnect(false);
                          toast.success("Mailbox disconnected");
                        },
                      })
                    }
                    disabled={disconnect.isPending}
                  >
                    {disconnect.isPending && <Loader2 className="animate-spin" />}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingDisconnect(true)}
                >
                  <Unplug />
                  Disconnect mailbox
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Connect a Gmail account to send supplier inquiries and pull replies
            back onto the sourcing request that produced them. Only threads
            started from this system are read — the rest of the mailbox is never
            touched.
          </p>
          {isOwner ? (
            <Button
              type="button"
              size="sm"
              onClick={() => connect.mutate()}
              disabled={connect.isPending || !data?.configured}
            >
              {connect.isPending && <Loader2 className="animate-spin" />}
              Connect Gmail
            </Button>
          ) : (
            <p className="text-[11px] font-medium text-muted-foreground">
              Only the account owner can connect a mailbox.
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

/** Surface the OAuth callback's outcome, which arrives as a query string
 *  because Google navigated the whole browser rather than answering a fetch. */
function useOAuthResultToast() {
  const params = useSearchParams();
  const status = params.get("status");
  const message = params.get("message");
  const email = params.get("email");

  useEffect(() => {
    if (!status) return;
    if (status === "connected") {
      toast.success(`Connected ${email ?? "mailbox"}`, { duration: 5000 });
    } else if (status === "error") {
      toast.error(message ?? "Could not connect the mailbox", { duration: 8000 });
    }
    // Strip the params so a refresh does not replay the toast.
    window.history.replaceState({}, "", window.location.pathname);
  }, [status, message, email]);
}

function SenderNameForm({ initialName }: { initialName: string }) {
  const rename = useUpdateMailboxName();
  const [displayName, setDisplayName] = useState(initialName);

  return (
    <form
      className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        rename.mutate(displayName.trim() || null, {
          onSuccess: () => toast.success("Sender name updated"),
          onError: (error) =>
            toast.error(
              error instanceof ApiError
                ? error.message
                : "Could not update the sender name",
            ),
        });
      }}
    >
      <Field label="Sender name" className="min-w-[220px] flex-1">
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Ali, TechNest Pharma"
          maxLength={120}
        />
      </Field>
      <Button type="submit" size="sm" variant="outline" disabled={rename.isPending}>
        {rename.isPending && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </form>
  );
}

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warning";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-[11px] font-medium leading-relaxed",
        tone === "warning" &&
          "border-warning/30 bg-warning/10 text-warning-foreground",
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <div className="min-w-0 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[10px]">
        {children}
      </div>
    </div>
  );
}
