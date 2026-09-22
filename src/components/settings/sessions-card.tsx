"use client";

import { useState } from "react";
import { Laptop, Loader2, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api";
import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/lib/queries";
import type { AccountSession } from "@/types/api";
import { SettingsCard } from "./settings-workspace";

/** Mirrors `AuthService.SESSION_LIST_LIMIT` on the backend. */
const SESSION_LIST_LIMIT = 20;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsCard() {
  const { data, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const [confirmingAll, setConfirmingAll] = useState(false);

  const sessions = data ?? [];
  const otherCount = sessions.filter((session) => !session.is_current).length;

  async function revokeOne(session: AccountSession) {
    try {
      await revokeSession.mutateAsync(session.id);
      toast.success("Session signed out", { duration: 4000 });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not sign out that session",
      );
    }
  }

  async function revokeAllOthers() {
    try {
      const result = await revokeOthers.mutateAsync();
      toast.success(result.detail, { duration: 5000 });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not sign out other sessions",
      );
    } finally {
      setConfirmingAll(false);
    }
  }

  return (
    <SettingsCard
      icon={Laptop}
      title="Active Sessions"
      description="Devices currently signed in to your account"
    >
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-xs font-medium text-muted-foreground">No active sessions.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold break-words text-foreground">
                  {session.device}
                  {session.is_current && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success ring-1 ring-inset ring-success/20">
                      This device
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {session.ip ? `${session.ip} · ` : ""}Signed in{" "}
                  {formatDateTime(session.created_at)}
                </p>
              </div>
              {!session.is_current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => revokeOne(session)}
                  disabled={revokeSession.isPending}
                  className="h-8 shrink-0 text-xs"
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {sessions.length >= SESSION_LIST_LIMIT && (
        <p className="text-[11px] font-medium text-muted-foreground">
          Showing the {SESSION_LIST_LIMIT} most recent sessions — there may be older ones
          still active. &ldquo;Sign out of other devices&rdquo; reaches all of them.
        </p>
      )}

      {otherCount > 0 && (
        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingAll(true)}>
            <LogOut className="size-3.5" strokeWidth={2.25} />
            Sign out of other devices
          </Button>
        </div>
      )}

      {confirmingAll && (
        <ConfirmDialog
          title="Sign out of other devices?"
          description="Every other signed-in device will need to sign in again. This device stays signed in."
          confirmLabel="Sign out others"
          busy={revokeOthers.isPending}
          onConfirm={revokeAllOthers}
          onCancel={() => setConfirmingAll(false)}
        />
      )}
    </SettingsCard>
  );
}
