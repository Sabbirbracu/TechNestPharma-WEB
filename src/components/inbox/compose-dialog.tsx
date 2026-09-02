"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  isMailboxReauthError,
  useSendDirectMail,
  useSendInquiryById,
} from "@/lib/queries";

/**
 * Compose an email that belongs to no tender and no sourcing request.
 *
 * This is the gap the client named: every other send path in the ERP starts
 * from a product or a tender, and a good part of his day is mail that starts
 * from neither — a freight forwarder, a certificate chased up, somebody met at
 * a fair last week who is not in the catalogue yet.
 *
 * Deliberately plain. The enquiry dialog next door is a long form because an
 * inquiry has a checklist the supplier has to answer line by line; this one is
 * a To, a subject and a body, because that is what the buyer is actually
 * doing. Adding the enquiry template here would make the quick note the
 * expensive path.
 *
 * The recipient is a free-typed address (decision 2026-08-31). The backend
 * matches it against the address book on the way through: if it belongs to a
 * company on file the message lands on that supplier's timeline, and if it
 * belongs to nobody it is kept unattached rather than refused — which is what
 * `communication.company_id` was made nullable for in migration 0026.
 */
export function ComposeDialog({
  onClose,
  initialTo = "",
  initialSubject = "",
  threadId = null,
  replyingTo = null,
  requestId = null,
}: {
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  /** Set to continue a conversation rather than start one. */
  threadId?: string | null;
  /** Who the reply is to, for the header line. */
  replyingTo?: string | null;
  /**
   * Set when this reply belongs to a sourcing request, which changes the
   * endpoint underneath — not the dialog.
   *
   * It has to: `/mailbox/inbox/send` is owner-only (the inbox is the client's
   * own mailbox), while Sourcing is open to staff, so routing a sourcing reply
   * through the inbox endpoint would 403 for every staff member. The
   * request-scoped endpoint is also the one that records the message on the
   * enquiry's timeline rather than leaving it unattached.
   */
  requestId?: number | null;
}) {
  const direct = useSendDirectMail();
  const onRequest = useSendInquiryById();
  const send = requestId ? onRequest : direct;
  // Plain initialisers, no reset effect. The caller mounts this component only
  // while it is open and gives it a key that changes per compose, so React
  // discards the state itself — without that, a reply prefilled from the last
  // thread opened is how one supplier's message gets sent to another.
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const recipients = splitAddresses(to);
  const ccList = splitAddresses(cc);
  const canSend =
    recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  function submit() {
    setError(null);

    const invalid = [...recipients, ...ccList].find(
      (address) => !LOOKS_LIKE_EMAIL.test(address),
    );
    if (invalid) {
      // Caught here rather than left to the 422 so the buyer sees *which*
      // address is wrong — the server's error names the field, not the value.
      setError(`"${invalid}" does not look like an email address.`);
      return;
    }

    const payload = {
      to: recipients,
      cc: ccList,
      subject: subject.trim(),
      body,
      thread_id: threadId,
    };
    const handlers = {
      onSuccess: () => {
        toast.success("Sent.");
        onClose();
      },
      onError: (err: unknown) => {
        if (isMailboxReauthError(err)) {
          setError(
            "The Gmail connection has expired. Reconnect it in Settings → Supplier Mail, then send again.",
          );
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "That message did not send.",
        );
      },
    };

    if (requestId) {
      onRequest.mutate({ requestId, payload }, handlers);
    } else {
      direct.mutate(payload, handlers);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-dialog-title"
        className="relative flex h-[88vh] w-[92vw] max-w-3xl flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="compose-dialog-title"
              className="text-base font-bold text-foreground"
            >
              {threadId ? "Reply" : "New Email"}
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {threadId
                ? `Continuing the conversation with ${replyingTo ?? "this sender"}`
                : "Sent from your connected mailbox"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              To
            </span>
            <Input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="supplier@example.com, second@example.com"
              autoComplete="off"
              className="h-9 text-sm"
            />
            <span className="block text-[11px] font-medium text-muted-foreground">
              Any address. If it matches a company already on file, this email
              is added to their timeline automatically.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Cc <span className="font-medium normal-case">(optional)</span>
            </span>
            <Input
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="colleague@example.com"
              autoComplete="off"
              className="h-9 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Subject
            </span>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="What this is about"
              className="h-9 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Message
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={14}
              placeholder="Write your message…"
              className="w-full resize-y rounded-xl border-2 border-input bg-background px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground shadow-sm outline-none transition-colors focus:border-primary/40"
            />
          </label>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-[11px] font-medium text-muted-foreground">
            Sends as you, from your own Gmail — replies come back to this inbox.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={send.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSend || send.isPending}>
              {send.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// Deliberately loose. The server validates properly with `EmailStr`; this only
// has to catch the typo the buyer can see and fix, and a strict RFC 5322
// pattern would reject addresses that are perfectly valid and deliverable.
const LOOKS_LIKE_EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function splitAddresses(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
