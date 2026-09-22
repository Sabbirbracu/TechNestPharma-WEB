"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AlertCircle, LayoutTemplate, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  isMailboxReauthError,
  useEmailTemplates,
  useGroupedInquiryDraft,
  useSendGroupedInquiry,
} from "@/lib/queries";
import type { EnquiryDetail, EnquiryItem } from "@/types/api";

/**
 * Send a drafted enquiry, or a follow-up on one already sent (2026-09-17).
 *
 * Both go through the enquiry's own send endpoint, so the email is filed on
 * the enquiry and continues its conversation. A draft send uses the enquiry
 * draft (every product in one body); a follow-up names only the products still
 * waiting for a quote.
 */
export function SendEnquiryDialog({
  enquiry,
  mode,
  waitingItems,
  onClose,
}: {
  enquiry: EnquiryDetail;
  mode: "enquiry" | "follow_up";
  waitingItems: EnquiryItem[];
  onClose: () => void;
}) {
  const fetchDraft = useGroupedInquiryDraft();
  const send = useSendGroupedInquiry();
  const templates = useEmailTemplates(mode === "enquiry" ? "enquiry" : "follow_up");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // What the last applied template produced — to tell whether the buyer has
  // edited the message since, before a template switch overwrites it.
  const applied = useRef({ subject: "", body: "" });
  const [threadId, setThreadId] = useState<string | null>(enquiry.external_thread_id);
  const [ready, setReady] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  /** Write the email with a template (null = the built-in one). The server
   *  fills a saved template in, so what shows here is what is sent. */
  function applyTemplate(id: number | null, { first = false } = {}) {
    setLoadingTemplate(true);
    setError(null);
    fetchDraft
      .mutateAsync({ inquiryId: enquiry.id, templateId: id })
      .then((draft) => {
        if (first) {
          setTo(draft.to.join(", "));
          setThreadId(draft.thread_id ?? enquiry.external_thread_id);
        }
        let nextSubject = draft.subject;
        let nextBody = draft.body;
        if (mode === "follow_up") {
          // A follow-up stays on the enquiry's thread and subject.
          const base = latestSubject(enquiry) ?? draft.subject;
          nextSubject = base.toLowerCase().startsWith("re:") ? base : `Re: ${base}`;
          if (id === null) nextBody = followUpBody(enquiry, waitingItems);
        }
        setSubject(nextSubject);
        setBody(nextBody);
        applied.current = { subject: nextSubject, body: nextBody };
        setTemplateId(id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not prepare the email."))
      .finally(() => {
        setReady(true);
        setLoadingTemplate(false);
      });
  }

  // Prepared once the template list has loaded, so a default template is
  // pre-selected rather than swapped in a moment later.
  useEffect(() => {
    if (started.current || templates.isPending) return;
    started.current = true;
    const preferred = templates.data?.find((t) => t.is_default)?.id ?? null;
    applyTemplate(preferred, { first: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.isPending]);

  function changeTemplate(value: string) {
    const id = value === "builtin" ? null : Number(value);
    const edited = subject !== applied.current.subject || body !== applied.current.body;
    if (edited && !window.confirm("Replace the message you have edited with this template?")) return;
    applyTemplate(id);
  }

  function submit() {
    setError(null);
    const recipients = to.split(/[,;]/).map((a) => a.trim()).filter(Boolean);
    if (!recipients.length) {
      setError("Add at least one recipient.");
      return;
    }
    send.mutate(
      {
        inquiryId: enquiry.id,
        payload: { to: recipients, subject: subject.trim(), body, thread_id: threadId },
      },
      {
        onSuccess: () => {
          toast.success(mode === "enquiry" ? `${enquiry.reference} sent` : "Follow-up sent");
          onClose();
        },
        onError: (err) =>
          setError(
            isMailboxReauthError(err)
              ? "The Gmail connection expired — reconnect it in Settings, then send again."
              : err instanceof ApiError
                ? err.message
                : "The email did not send.",
          ),
      },
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !send.isPending) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="send-enquiry-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Send className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 id="send-enquiry-title" className="text-base font-bold text-foreground">
              {mode === "enquiry" ? "Send enquiry" : "Send follow-up"}
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {enquiry.supplier.name} · {enquiry.reference}
              {threadId ? " · continues the existing thread" : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}
          {!ready ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Preparing the email…
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <label className="block min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <LayoutTemplate className="size-3.5" />
                    Template
                  </span>
                  <Select
                    aria-label="Email template"
                    value={templateId === null ? "builtin" : String(templateId)}
                    onChange={(e) => changeTemplate(e.target.value)}
                    disabled={loadingTemplate}
                  >
                    <option value="builtin">
                      Standard {mode === "enquiry" ? "enquiry" : "follow-up"} (built-in)
                    </option>
                    {(templates.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? " — default" : ""}
                      </option>
                    ))}
                  </Select>
                </label>
                {loadingTemplate && <Loader2 className="mb-3 size-4 animate-spin text-muted-foreground" />}
                <Link
                  href="/email/templates"
                  target="_blank"
                  className="mb-2.5 shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  Manage templates
                </Link>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">To</span>
                <Input id="send-to" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Subject</span>
                <Input id="send-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Message</span>
                <textarea
                  id="send-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[18rem] w-full rounded-xl border-2 border-input bg-card px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:border-primary/50"
                />
              </label>
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!ready || send.isPending || !subject.trim() || !body.trim()}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function latestSubject(enquiry: EnquiryDetail): string | null {
  const outbound = [...enquiry.messages].reverse().find((m) => m.direction === "outbound" && m.subject);
  return outbound?.subject ?? null;
}

function followUpBody(enquiry: EnquiryDetail, waiting: EnquiryItem[]): string {
  const lines = (waiting.length ? waiting : enquiry.items)
    .map((item, index) => `${index + 1}. ${item.product_name}`)
    .join("\n");
  return `Dear Sir/Madam,

Following up on our enquiry ${enquiry.reference ?? ""}. We are still awaiting your quotation for:

${lines}

We would appreciate your best price, MOQ, lead time and price validity at your earliest convenience.

Best regards`;
}
