"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Mail, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isMailboxReauthError,
  useInquiryDraft,
  useMailboxSettings,
  useSendInquiry,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InquiryDraft, MailboxStatus } from "@/types/api";

/**
 * Compose an inquiry to a supplier, pre-filled from the sourcing request.
 *
 * The draft arrives as editable text rather than a template the server renders
 * at send time (decision 2026-08-24). The buyer's edits are the point — he
 * knows which supplier needs the Chinese greeting and which one will not
 * answer without an application stated — and it means the message recorded
 * afterwards is the message that actually went out.
 *
 * Deliberately plain text. These go to factory sales desks; HTML mail from an
 * unfamiliar sender scores worse with spam filters and reads like marketing,
 * which gets a worse reply rate than something a person evidently typed.
 */
export function MailComposeDialog({
  requestId,
  supplierName,
  onClose,
  onSent,
}: {
  requestId: number;
  supplierName: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { data: settings } = useMailboxSettings();
  const { data: draft, isPending } = useInquiryDraft(requestId, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Send inquiry to ${supplierName}`}
        className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <Mail className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">
                {draft?.thread_id ? "Reply to" : "Send inquiry to"} {supplierName}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {settings?.account
                  ? `From ${settings.account.email_address}`
                  : "No mailbox connected"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        {isPending || !draft ? (
          <div className="flex items-center gap-2 p-8 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Preparing the draft…
          </div>
        ) : (
          /* Mounted only once the draft has arrived, so the form seeds its
             fields from `useState` initialisers instead of syncing them in an
             effect — no cascading render, and a background refetch can never
             overwrite something half-typed. */
          <ComposeForm
            requestId={requestId}
            supplierName={supplierName}
            draft={draft}
            canSend={settings?.can_send ?? false}
            accountStatus={settings?.account?.status ?? null}
            onClose={onClose}
            onSent={onSent}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function ComposeForm({
  requestId,
  supplierName,
  draft,
  canSend,
  accountStatus,
  onClose,
  onSent,
}: {
  requestId: number;
  supplierName: string;
  draft: InquiryDraft;
  canSend: boolean;
  accountStatus: MailboxStatus | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const send = useSendInquiry(requestId);
  const [to, setTo] = useState(() => draft.to.join(", "));
  const [subject, setSubject] = useState(() => draft.subject);
  const [body, setBody] = useState(() => draft.body);

  const recipients = to
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipients.length) {
      toast.error("Add at least one recipient");
      return;
    }
    send.mutate(
      {
        to: recipients,
        subject: subject.trim(),
        body,
        thread_id: draft.thread_id,
      },
      {
        onSuccess: () => {
          toast.success(`Inquiry sent to ${supplierName}`);
          onSent?.();
          onClose();
        },
        onError: (error) => {
          // The 7-day expiry is the likeliest failure here, and it has its own
          // remedy — say so instead of showing the raw message.
          if (isMailboxReauthError(error)) {
            toast.error(
              "The Gmail connection expired. Reconnect it in Settings → Supplier Mail.",
              { duration: 8000 },
            );
            return;
          }
          toast.error(
            error instanceof ApiError ? error.message : "Could not send the inquiry",
          );
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      {!canSend && (
        <Alert>
          {accountStatus === "needs_reauth"
            ? "The Gmail connection has expired. Reconnect it in Settings → Supplier Mail before sending."
            : "No Gmail account is connected. Connect one in Settings → Supplier Mail."}
        </Alert>
      )}

      {/* Gaps in the request, surfaced without blocking the draft — he can
          type an address himself, and often does. */}
      {draft.warnings.map((warning) => (
        <Alert key={warning}>{warning}</Alert>
      ))}

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          To
        </span>
        <Input
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="sales@factory.cn"
          autoComplete="off"
        />
        <span className="text-[10px] font-medium text-muted-foreground">
          Separate multiple addresses with commas.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Subject
        </span>
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={500}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Message
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={16}
          className={cn(
            "w-full rounded-xl border border-border/60 bg-background px-3 py-2.5",
            "font-mono text-xs leading-relaxed text-foreground",
            "outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15",
          )}
        />
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={send.isPending || !canSend || !recipients.length}
        >
          {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
          Send inquiry
        </Button>
      </div>
    </form>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-[11px] font-medium leading-relaxed text-warning-foreground"
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
