"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  downloadDocument,
  downloadMailAttachment,
  useAddDraftItemToSourcing,
  useApproveReply,
  useRejectReply,
  useReplyReview,
  useRetryReply,
  useUpdateDraftItem,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ReplyReview, ReviewItem, ReviewItemInput } from "@/types/api";
import { LINE_OUTCOME, formatDate, formatDateTime } from "./enquiry-taxonomy";
import { SourceEmail } from "./source-email";

/**
 * Quotation review (2026-09-22).
 *
 * A supplier reply is read by Gemini in the background into a DRAFT. This is
 * where a person checks it: the supplier's own email on the left, the draft on
 * the right. Clicking any evidence highlights the exact words a figure was
 * read from. The reviewer can correct a figure, match a product by hand,
 * exclude a line, add an additional product to the enquiry, and then Approve
 * — the only way an AI reading becomes an official quotation — or Reject.
 */

const CHIP = "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset";

export const REVIEW_STATUS: Record<string, { label: string; className: string }> = {
  none: { label: "Not read", className: "bg-secondary text-muted-foreground ring-border" },
  detected: { label: "Unreviewed", className: "bg-secondary text-muted-foreground ring-border" },
  processing: { label: "AI reading…", className: "bg-tile-blue-bg text-tile-blue ring-tile-blue/25" },
  extracted: { label: "Needs review", className: "bg-tile-amber-bg text-tile-amber ring-tile-amber/30" },
  failed: { label: "AI failed", className: "bg-destructive/10 text-destructive ring-destructive/20" },
  no_quotation: { label: "No quotation", className: "bg-secondary text-muted-foreground ring-border" },
  approved: { label: "Approved", className: "bg-success/10 text-success ring-success/25" },
  rejected: { label: "Rejected", className: "bg-secondary text-muted-foreground ring-border" },
};

const AVAILABILITY = [
  { value: "", label: "Not stated" },
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited" },
  { value: "on_request", label: "On request" },
  { value: "unavailable", label: "Unavailable" },
] as const;

export function QuotationReviewDialog({
  communicationId,
  focusItemId,
  onClose,
  onRecordManually,
}: {
  communicationId: number;
  focusItemId?: number | null;
  onClose: () => void;
  onRecordManually: () => void;
}) {
  const { data, isPending, error } = useReplyReview(communicationId);
  // Undefined until the user clicks some evidence; until then the row they
  // opened the dialog from is highlighted.
  const [picked, setHighlight] = useState<string | null | undefined>(undefined);
  const focused = data?.items.find((i) => i.id === focusItemId);
  const highlight =
    picked !== undefined ? picked : (focused?.evidence?.price ?? focused?.source_excerpt ?? null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  const status = data ? REVIEW_STATUS[data.status ?? "none"] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3.5">
          <ReceiptText className="size-5 text-primary" />
          <h2 id="review-title" className="text-base font-bold text-foreground">
            Review quotation
          </h2>
          {data && (
            <span className="truncate text-sm text-muted-foreground">
              {data.company_name ?? data.source.counterparty} · received {formatDateTime(data.source.occurred_at)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {status && <span className={cn(CHIP, status.className)}>{status.label}</span>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
              <X className="size-5" />
            </button>
          </span>
        </header>

        {isPending ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the reply…
          </div>
        ) : error || !data ? (
          <p role="alert" className="m-5 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="size-4" />
            {error instanceof ApiError ? error.message : "This reply could not be loaded."}
          </p>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:overflow-hidden">
              <div className="flex min-h-[320px] flex-col gap-2 lg:min-h-0">
                <SourceEmail
                  subject={data.source.subject}
                  body={data.source.body}
                  counterparty={data.source.counterparty}
                  occurredAt={data.source.occurred_at}
                  hasAttachments={data.source.has_attachments}
                  highlight={highlight}
                />
                {data.source.attachments.length > 0 && (
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {data.source.attachments.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() =>
                          file.document_id
                            ? downloadDocument(file.document_id, file.filename)
                            : downloadMailAttachment(file.id, file.filename)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/40"
                      >
                        <Paperclip className="size-3" />
                        {file.filename}
                      </button>
                    ))}
                    <span className="text-[11px] text-muted-foreground">Attachments are not read by AI yet.</span>
                  </div>
                )}
              </div>

              <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
                <StatusNotice review={data} onRecordManually={onRecordManually} />
                <ReviewBody review={data} onHighlight={setHighlight} highlight={highlight} />
              </div>
            </div>
            <Footer review={data} onClose={onClose} onRecordManually={onRecordManually} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// --- Status -----------------------------------------------------------------------

function StatusNotice({ review, onRecordManually }: { review: ReplyReview; onRecordManually: () => void }) {
  const retry = useRetryReply();
  const retryButton = review.ai_available && (
    <Button
      variant="outline"
      size="sm"
      disabled={retry.isPending}
      onClick={() =>
        retry.mutate(review.communication_id, {
          onSuccess: () => toast.success("Queued — the reply is being read again"),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not retry"),
        })
      }
    >
      <RefreshCw className="size-3.5" />
      {review.status === null ? "Read with AI" : "Retry AI processing"}
    </Button>
  );
  const manualButton = (
    <Button variant="ghost" size="sm" onClick={onRecordManually}>
      <Plus className="size-3.5" />
      Record quotation manually
    </Button>
  );

  if (review.status === null) {
    return (
      <Notice tone="muted" icon={<Sparkles className="size-4" />}>
        <p>This reply has not been read by AI yet.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {retryButton}
          {manualButton}
        </div>
      </Notice>
    );
  }
  if (review.status === "detected" || review.status === "processing") {
    return (
      <Notice tone="info" icon={<Loader2 className="size-4 animate-spin" />}>
        <p>
          {!review.ai_available
            ? "AI is not set up on the server (GEMINI_API_KEY), so this reply is waiting to be read."
            : review.status === "processing"
              ? "Gemini is reading this reply…"
              : review.next_attempt_at
                ? `Waiting to retry (the AI service was busy) — next attempt ${formatDateTime(review.next_attempt_at)}.`
                : "Queued for AI reading. This usually takes under a minute."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">{manualButton}</div>
      </Notice>
    );
  }
  if (review.status === "failed") {
    return (
      <Notice tone="error" icon={<AlertCircle className="size-4" />}>
        <p>
          AI could not read this reply{review.extraction_error ? ` — ${review.extraction_error}` : ""}. The email
          itself is safe.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {retryButton}
          {manualButton}
        </div>
      </Notice>
    );
  }
  if (review.status === "no_quotation") {
    return (
      <Notice tone="muted" icon={<Sparkles className="size-4" />}>
        <p>
          {review.analysis?.summary?.[0] ?? "AI found no quotation in this reply."} If it does contain prices, retry or
          record them by hand.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {retryButton}
          {manualButton}
        </div>
      </Notice>
    );
  }
  if (review.status === "rejected") {
    return (
      <Notice tone="muted" icon={<Ban className="size-4" />}>
        Rejected{review.reviewed_at ? ` on ${formatDate(review.reviewed_at)}` : ""} — nothing from this reply was recorded.
      </Notice>
    );
  }
  if (review.status === "approved") {
    return (
      <Notice tone="success" icon={<CheckCircle2 className="size-4" />}>
        Approved{review.reviewed_at ? ` on ${formatDate(review.reviewed_at)}` : ""} — {review.quotations.length} quotation
        {review.quotations.length === 1 ? "" : "s"} recorded in the supplier&rsquo;s history.
      </Notice>
    );
  }
  const needs = review.items.filter((i) => !i.is_excluded && i.requires_review).length;
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <span>
        Read by {review.model ?? "AI"}
        {review.extracted_at ? ` on ${formatDateTime(review.extracted_at)}` : ""}. Nothing is recorded until you approve.
        Click any evidence to see it in the email.
        {needs > 0 && <strong className="font-semibold text-tile-amber"> {needs} item{needs === 1 ? "" : "s"} need your attention.</strong>}
      </span>
    </p>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "info" | "error" | "muted" | "success";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
        tone === "info" && "bg-tile-blue-bg text-tile-blue",
        tone === "error" && "bg-destructive/5 text-destructive",
        tone === "muted" && "bg-secondary/60 text-muted-foreground",
        tone === "success" && "bg-success/10 text-success",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// --- The draft -----------------------------------------------------------------------

function ReviewBody({
  review,
  highlight,
  onHighlight,
}: {
  review: ReplyReview;
  highlight: string | null;
  onHighlight: (text: string | null) => void;
}) {
  const quoted = review.items.filter((i) => !i.is_additional);
  const additional = review.items.filter((i) => i.is_additional);
  const others = review.line_outcomes.filter((o) => o.outcome !== "quoted");
  const editable = review.status === "extracted";

  if (review.status !== "extracted" && review.status !== "approved" && review.status !== "rejected") {
    return null;
  }
  const counts = {
    quoted: review.line_outcomes.filter((o) => o.outcome === "quoted").length,
    declined: review.line_outcomes.filter((o) => o.outcome === "declined").length,
    missing: review.line_outcomes.filter((o) => o.outcome === "not_mentioned").length,
  };

  return (
    <div className="space-y-4">
      {review.line_outcomes.length > 0 && (
        <p className="text-sm text-foreground/85">
          <strong>{counts.quoted}</strong> of {review.line_outcomes.length} requested products quoted
          {counts.declined > 0 && <> · <strong>{counts.declined}</strong> unavailable</>}
          {counts.missing > 0 && <> · <strong>{counts.missing}</strong> not in the reply</>}
          {additional.length > 0 && <> · <strong>{additional.length}</strong> additional</>}
        </p>
      )}

      {quoted.length > 0 && (
        <Section title="Quoted products">
          {quoted.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              review={review}
              editable={editable}
              highlight={highlight}
              onHighlight={onHighlight}
            />
          ))}
        </Section>
      )}

      {others.length > 0 && (
        <Section title="Not quoted">
          <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
            {others.map((o) => {
              const style = LINE_OUTCOME[o.outcome];
              return (
                <li key={o.sourcing_request_id}>
                  <button
                    type="button"
                    disabled={!o.source_excerpt}
                    onClick={() => onHighlight(o.source_excerpt)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left enabled:hover:bg-accent/30"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{o.product_name ?? "Product"}</span>
                      {o.note && <span className="block text-xs text-muted-foreground">{o.note}</span>}
                    </span>
                    <span className={cn("shrink-0 text-xs font-semibold", style.className)}>
                      {o.outcome === "declined" ? "Unavailable" : style.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {editable && others.some((o) => o.outcome === "declined") && (
            <p className="text-[11px] text-muted-foreground">Approving marks unavailable products as Unavailable on the enquiry.</p>
          )}
        </Section>
      )}

      {additional.length > 0 && (
        <Section title="Additional products detected">
          <p className="text-xs text-muted-foreground">
            The supplier offered these without being asked. They are not added to the enquiry unless you choose to.
          </p>
          {additional.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              review={review}
              editable={editable}
              highlight={highlight}
              onHighlight={onHighlight}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

const EVIDENCE_LABELS: Record<string, string> = {
  price: "Price",
  moq: "MOQ",
  lead_time: "Lead time",
  validity: "Validity",
  incoterm: "Incoterm",
  availability: "Availability",
};

function ItemCard({
  item,
  review,
  editable,
  highlight,
  onHighlight,
}: {
  item: ReviewItem;
  review: ReplyReview;
  editable: boolean;
  highlight: string | null;
  onHighlight: (text: string | null) => void;
}) {
  const update = useUpdateDraftItem(review.communication_id);
  const addToSourcing = useAddDraftItemToSourcing(review.communication_id);
  const save = (payload: ReviewItemInput) =>
    update.mutate(
      { id: item.id, payload },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save") },
    );
  const evidence = Object.entries(item.evidence ?? {}).filter(([, text]) => text);
  const line = review.lines.find((l) => l.sourcing_request_id === item.sourcing_request_id);
  const matched = line?.product_name ?? item.product_name;
  const dimmed = item.is_excluded && !(item.is_additional && editable);

  return (
    <article
      className={cn(
        "rounded-xl border bg-card",
        item.requires_review && !item.is_excluded ? "border-tile-amber/50" : "border-border",
        dimmed && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{matched ?? item.raw_product_name}</p>
          <p className="text-xs text-muted-foreground">
            Supplier wrote &ldquo;{item.raw_product_name}&rdquo;
            {item.cas_number && <> · CAS {item.cas_number}</>}
          </p>
        </div>
        <MatchChip item={item} />
      </div>

      {item.review_reason && !item.is_excluded && (
        <p className="mx-4 mt-2 flex items-start gap-1.5 rounded-lg bg-tile-amber-bg px-2.5 py-1.5 text-xs font-medium text-tile-amber">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          {item.review_reason}
        </p>
      )}

      {editable && (!item.is_additional || item.sourcing_request_id) && (
        <label className="mx-4 mt-2 flex items-center gap-2 text-xs">
          <span className="shrink-0 font-semibold text-muted-foreground">Product line</span>
          <select
            value={item.sourcing_request_id ?? ""}
            onChange={(event) =>
              save({ sourcing_request_id: event.target.value ? Number(event.target.value) : null })
            }
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs font-medium"
          >
            <option value="">— Choose the requested product —</option>
            {review.lines.map((l) => (
              <option key={l.sourcing_request_id} value={l.sourcing_request_id}>
                {l.product_name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-4">
        <Field label="Price" value={item.price_min} editable={editable} onSave={(v) => save({ price_min: v })} />
        <Field label="Up to" value={item.price_max} editable={editable} onSave={(v) => save({ price_max: v })} placeholder="—" />
        <Field label="Currency" value={item.currency ?? review.currency} editable={editable} onSave={(v) => save({ currency: v?.toUpperCase() ?? null })} />
        <Field label="Per" value={item.price_unit} editable={editable} onSave={(v) => save({ price_unit: v })} />
        <Field label="MOQ" value={item.moq} editable={editable} onSave={(v) => save({ moq: v })} />
        <Field label="MOQ unit" value={item.moq_unit} editable={editable} onSave={(v) => save({ moq_unit: v })} />
        <Field
          label="Lead time (days)"
          value={item.lead_time_days?.toString() ?? null}
          hint={item.lead_time_text}
          editable={editable}
          onSave={(v) => save({ lead_time_days: v ? Number(v) : null })}
        />
        <Field label="Incoterm" value={item.incoterm} editable={editable} onSave={(v) => save({ incoterm: v })} />
        <Field
          label="Valid until"
          value={item.valid_until ?? review.valid_until}
          hint={item.validity_days ? `${item.validity_days} days` : null}
          type="date"
          editable={editable}
          onSave={(v) => save({ valid_until: v })}
        />
        <label className="min-w-0 space-y-0.5">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Availability</span>
          {editable ? (
            <select
              value={item.availability ?? ""}
              onChange={(event) =>
                save({ availability: (event.target.value || null) as ReviewItemInput["availability"] })
              }
              className="h-8 w-full rounded-lg border border-input bg-card px-1.5 text-xs font-medium"
            >
              {AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="block text-sm font-medium">{AVAILABILITY.find((a) => a.value === (item.availability ?? ""))?.label}</span>
          )}
        </label>
        {item.specification && (
          <div className="col-span-2 min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Specification</span>
            <span className="block truncate text-sm">{item.specification}</span>
          </div>
        )}
      </div>

      {item.price_tiers && item.price_tiers.length > 0 && (
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          Price tiers:{" "}
          {item.price_tiers
            .map((t) => `${t.min_quantity ?? "?"}${t.quantity_unit ? ` ${t.quantity_unit}` : ""} → ${t.price}`)
            .join(" · ")}
        </p>
      )}

      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/70 px-4 py-2">
          {evidence.map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => onHighlight(text)}
              title="Show in the email"
              className={cn(
                "max-w-full truncate rounded-md border px-2 py-0.5 text-left text-[11px] hover:border-primary/40",
                highlight === text ? "border-warning bg-warning/15" : "border-border bg-secondary/40",
              )}
            >
              <span className="font-semibold text-muted-foreground">{EVIDENCE_LABELS[key] ?? key}: </span>
              &ldquo;{text}&rdquo;
            </button>
          ))}
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border/70 px-2 py-1.5">
          {item.is_additional && !item.sourcing_request_id ? (
            <>
              <span className="mr-auto pl-2 text-xs text-muted-foreground">
                {item.product_id ? "Not part of this enquiry" : "Not in the catalogue — add the product first to source it"}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!item.product_id || addToSourcing.isPending}
                onClick={() =>
                  addToSourcing.mutate(item.id, {
                    onSuccess: () => toast.success(`${matched ?? item.raw_product_name} added to this enquiry`),
                    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add it"),
                  })
                }
              >
                <Plus className="size-3.5" />
                Add to sourcing
              </Button>
              <span className="px-2 text-xs font-semibold text-muted-foreground">Ignored unless added</span>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => save({ is_excluded: !item.is_excluded })}>
              {item.is_excluded ? "Include in approval" : "Exclude"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function MatchChip({ item }: { item: ReviewItem }) {
  if (item.is_excluded && !item.is_additional) {
    return <span className={cn(CHIP, "bg-secondary text-muted-foreground ring-border")}>Excluded</span>;
  }
  if (item.product_id === null) {
    return <span className={cn(CHIP, "bg-destructive/10 text-destructive ring-destructive/20")}>No product match</span>;
  }
  if (item.requires_review) {
    return <span className={cn(CHIP, "bg-tile-amber-bg text-tile-amber ring-tile-amber/30")}>Needs review</span>;
  }
  const method = item.match_method === "manual" ? "matched by you" : `matched · ${item.match_method ?? "auto"}`;
  return <span className={cn(CHIP, "bg-success/10 text-success ring-success/25")}>{method}</span>;
}

type FieldProps = {
  label: string;
  value: string | null;
  hint?: string | null;
  editable: boolean;
  onSave: (value: string | null) => void;
  placeholder?: string;
  type?: "text" | "date";
};

/** An inline field: edits locally, saves the one changed value on blur.
 *  Keyed on the saved value, so a server-side change resets the input. */
function Field(props: FieldProps) {
  return <FieldInput key={props.value ?? ""} {...props} />;
}

function FieldInput({
  label,
  value,
  hint,
  editable,
  onSave,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | null;
  hint?: string | null;
  editable: boolean;
  onSave: (value: string | null) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  const [draft, setDraft] = useState(value ?? "");
  const shown = useMemo(() => {
    if (!value) return "—";
    if (type === "date") return formatDate(value);
    const n = Number(value);
    return Number.isNaN(n) ? value : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [value, type]);

  return (
    <label className="min-w-0 space-y-0.5">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {editable ? (
        <input
          type={type}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const next = draft.trim() || null;
            if (next !== (value ?? null)) onSave(next);
          }}
          className="h-8 w-full rounded-lg border border-input bg-card px-2 text-sm font-medium tabular-nums focus-visible:border-ring focus-visible:outline-none"
        />
      ) : (
        <span className="block truncate text-sm font-medium tabular-nums">{shown}</span>
      )}
      {hint && <span className="block truncate text-[10px] text-muted-foreground">&ldquo;{hint}&rdquo;</span>}
    </label>
  );
}

// --- Actions ------------------------------------------------------------------------

function Footer({
  review,
  onClose,
  onRecordManually,
}: {
  review: ReplyReview;
  onClose: () => void;
  onRecordManually: () => void;
}) {
  const approve = useApproveReply();
  const reject = useRejectReply();
  const retry = useRetryReply();
  const busy = approve.isPending || reject.isPending || retry.isPending;
  const included = review.items.filter((i) => !i.is_excluded);
  const unmatched = included.filter((i) => i.sourcing_request_id === null).length;
  const fail = (err: unknown, fallback: string) =>
    toast.error(err instanceof ApiError ? err.message : fallback);

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
      <div className="flex flex-wrap gap-2">
        {review.status === "extracted" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={busy}
              onClick={() =>
                reject.mutate(review.communication_id, {
                  onSuccess: () => toast.success("Rejected — nothing was recorded"),
                  onError: (err) => fail(err, "Could not reject"),
                })
              }
            >
              <Ban className="size-3.5" />
              Reject
            </Button>
            {review.ai_available && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  retry.mutate(review.communication_id, {
                    onSuccess: () => toast.success("Queued — the reply is being read again"),
                    onError: (err) => fail(err, "Could not retry"),
                  })
                }
              >
                <RefreshCw className="size-3.5" />
                Re-read with AI
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onRecordManually}>
              <Plus className="size-3.5" />
              Record manually
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {review.status === "extracted" && unmatched > 0 && (
          <span className="text-xs font-medium text-tile-amber">
            Match or exclude {unmatched} item{unmatched === 1 ? "" : "s"} to approve
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        {review.status === "extracted" && (
          <Button
            size="sm"
            disabled={busy || unmatched > 0 || included.length === 0}
            onClick={() =>
              approve.mutate(review.communication_id, {
                onSuccess: (result) => {
                  toast.success(
                    `${result.quotation_ids.length} quotation${result.quotation_ids.length === 1 ? "" : "s"} approved`,
                  );
                  onClose();
                },
                onError: (err) => fail(err, "Could not approve"),
              })
            }
          >
            {approve.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Approve {included.length} quotation{included.length === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </footer>
  );
}
