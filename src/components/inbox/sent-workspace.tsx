"use client";

import { useState } from "react";
import { PenSquare, RefreshCw, SendHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "@/components/inbox/compose-dialog";
import { SentMail } from "@/components/inbox/sent-mail";
import { baseSubject } from "@/lib/mail-quote";
import { keys, useMailboxSettings } from "@/lib/queries";

/**
 * Email → Sent (2026-09-17). Was the fourth tab of the inbox; it reads a
 * different source (the ERP's own `communication` rows, see `SentMail`), so it
 * now has its own page under the Email menu.
 */
export function SentWorkspace() {
  const queryClient = useQueryClient();
  const { data: settings } = useMailboxSettings();
  const address = settings?.account?.email_address;
  const [compose, setCompose] = useState<{
    to: string;
    subject: string;
    threadId: string | null;
  } | null>(null);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-3 py-2">
          <SendHorizontal className="size-4 text-primary" />
          <h1 className="text-sm font-bold text-foreground">Sent</h1>
          <p className="hidden truncate text-xs font-medium text-muted-foreground md:block">
            {address
              ? `Emails this system sent from ${address}.`
              : "Connect a Gmail account to see what it sent."}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              title="Re-read the sent log"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: keys.mailbox.sentAll })
              }
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              title="Write a new email"
              onClick={() => setCompose({ to: "", subject: "", threadId: null })}
            >
              <PenSquare className="size-3.5" />
              <span className="hidden sm:inline">New Email</span>
            </Button>
          </div>
        </div>

        <SentMail
          onReply={(message) => {
            const base = baseSubject(message.subject) || "(no subject)";
            setCompose({
              to: message.counterparty ?? "",
              subject: base.toLowerCase().startsWith("re:") ? base : `Re: ${base}`,
              threadId: message.external_thread_id,
            });
          }}
        />
      </div>

      {compose && (
        <ComposeDialog
          key={`${compose.threadId ?? "new"}:${compose.to}`}
          onClose={() => setCompose(null)}
          initialTo={compose.to}
          initialSubject={compose.subject}
          threadId={compose.threadId}
          replyingTo={compose.to || null}
        />
      )}
    </div>
  );
}
