"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  isMailboxReauthError,
  useContacts,
  useCreateSourcingRequest,
  useInquiryPreviews,
  useMailboxSettings,
  useSendInquiryById,
} from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  InquiryPreviewInput,
  MailboxSettings,
  TenderShortlist,
} from "@/types/api";

/** A shortlist row that's actually eligible for an enquiry — must have a real
 *  supplier attached. Callers narrow to this before opening the dialog. */
export type EnquiryTarget = TenderShortlist & { company_id: number };

/**
 * What the supplier is asked for. Every ticked box is a line in the email, so
 * this list is the checklist and the template at once — the values match the
 * keys the backend's `ASK_TERM_LINES` / `ASK_DOCUMENT_LABELS` render, and the
 * body comes back from `/mailbox/inquiry-preview` rather than being assembled
 * here. Keeping one template on the server is what makes the preview honest:
 * the email shown is produced by the code that produces the real draft.
 */
const CHECKLIST: {
  value: string;
  label: string;
  group: "terms" | "documents";
  defaultChecked: boolean;
}[] = [
  { value: "price", label: "Price", group: "terms", defaultChecked: true },
  { value: "moq", label: "MOQ", group: "terms", defaultChecked: true },
  { value: "packing", label: "Packing", group: "terms", defaultChecked: true },
  { value: "lead_time", label: "Lead time", group: "terms", defaultChecked: true },
  { value: "incoterm", label: "Incoterm & port", group: "terms", defaultChecked: true },
  { value: "payment_terms", label: "Payment terms", group: "terms", defaultChecked: true },
  { value: "validity", label: "Price validity", group: "terms", defaultChecked: true },
  { value: "sample", label: "Sample", group: "terms", defaultChecked: false },
  { value: "coa", label: "COA", group: "documents", defaultChecked: false },
  {
    value: "gmp_certificate",
    label: "GMP certificate",
    group: "documents",
    defaultChecked: false,
  },
  { value: "msds", label: "MSDS", group: "documents", defaultChecked: false },
  { value: "dmf", label: "DMF / CEP", group: "documents", defaultChecked: false },
  {
    value: "spec_sheet",
    label: "Spec sheet",
    group: "documents",
    defaultChecked: false,
  },
];

/** Units a pharma sourcing desk actually quotes in. Free text on the column,
 *  so whatever the tender line already carries is added to the list rather
 *  than silently replaced. */
const QUANTITY_UNITS = ["kg", "MT", "g", "L", "pcs", "drums", "boxes"];

const DEFAULT_ASKS = CHECKLIST.filter((ask) => ask.defaultChecked).map((ask) => ask.value);

/** What the buyer typed over the generated draft. Per field, so correcting a
 *  subject line does not also pin the body against checklist changes. */
type Override = Partial<Record<"to" | "subject" | "body", string>>;

function splitRecipients(value: string): string[] {
  return value
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * One or several enquiries for the same product, opened either from a single
 * supplier row's "Send Enquiry" button or from the group's bulk bar — same
 * dialog either way, since the only real difference is how many supplier
 * cards it lists (FR-SRC, per the tender→product→supplier→enquiry model).
 *
 * Two panes, because the two halves answer different questions: the left is
 * what is being asked, the right is what the supplier will actually read. The
 * preview is live — every checklist tick re-renders it server-side — and
 * editable, and an edit wins over the template from then on.
 *
 * Two ways out, deliberately: **Draft Enquiry** files the sourcing request and
 * stops, which is what a buyer wants when the address still needs chasing;
 * **Send Enquiry** files it and mails it through the connected Gmail account.
 */
export function StartEnquiryDialog({
  open,
  onClose,
  tenderId,
  productId,
  productName,
  targets,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tenderId: number;
  productId: number;
  productName: string;
  targets: EnquiryTarget[];
  onCreated: () => void;
}) {
  const createSourcing = useCreateSourcingRequest();
  const sendInquiry = useSendInquiryById();
  const { data: settings } = useMailboxSettings();

  const [contactByCompany, setContactByCompany] = useState<Record<number, number | "">>({});
  const [asks, setAsks] = useState<Set<string>>(() => new Set(DEFAULT_ASKS));
  const [notes, setNotes] = useState("");
  // One quantity for the dialog, not one per supplier: these targets are all
  // the same product on the same tender line, and asking three factories to
  // price three different tonnages would make the quotes incomparable.
  const [quantity, setQuantity] = useState(() => targets[0]?.quantity ?? "");
  const [quantityUnit, setQuantityUnit] = useState(
    () => targets[0]?.quantity_unit ?? "kg",
  );
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [activeId, setActiveId] = useState<number>(() => targets[0]?.id ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);

  // Notes go straight into the email body, so the preview has to follow them —
  // but not once per keystroke.
  const debouncedNotes = useDebounced(notes, 400);
  const debouncedQuantity = useDebounced(quantity, 400);
  const askKey = useMemo(() => Array.from(asks).sort().join(","), [asks]);

  // The column is free text, so a unit already on the tender line has to stay
  // selectable even when it is not one of ours.
  const unitOptions = useMemo(() => {
    const fromLine = targets[0]?.quantity_unit;
    return fromLine && !QUANTITY_UNITS.includes(fromLine)
      ? [fromLine, ...QUANTITY_UNITS]
      : QUANTITY_UNITS;
  }, [targets]);

  const previewInputs = useMemo<InquiryPreviewInput[]>(
    () =>
      targets.map((item) => ({
        product_id: productId,
        company_id: item.company_id,
        contact_person_id: contactByCompany[item.company_id] || null,
        required_quantity: debouncedQuantity.trim() || null,
        quantity_unit: quantityUnit.trim() || null,
        required_specification: item.specification,
        required_packing: item.packing,
        required_documents: askKey ? askKey.split(",") : [],
        notes: debouncedNotes.trim() || null,
      })),
    // `askKey` stands in for the Set, which is a new object on every tick.
    [
      targets,
      productId,
      contactByCompany,
      askKey,
      debouncedNotes,
      debouncedQuantity,
      quantityUnit,
    ],
  );

  const previews = useInquiryPreviews(previewInputs, open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  function toggleAsk(value: string) {
    setAsks((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  /** The message as it stands for one supplier: the generated draft, with
   *  anything the buyer typed over it winning. */
  function messageFor(index: number) {
    const item = targets[index];
    const draft = previews[index]?.data;
    const override = overrides[item.id] ?? {};
    return {
      to: override.to ?? draft?.to.join(", ") ?? "",
      subject: override.subject ?? draft?.subject ?? "",
      body: override.body ?? draft?.body ?? "",
      warnings: draft?.warnings ?? [],
      edited: Object.keys(override).length > 0,
      loading: !draft,
    };
  }

  function edit(targetId: number, field: keyof Override, value: string) {
    setOverrides((current) => ({
      ...current,
      [targetId]: { ...current[targetId], [field]: value },
    }));
  }

  function resetToTemplate(targetId: number) {
    setOverrides((current) => {
      const next = { ...current };
      delete next[targetId];
      return next;
    });
  }

  const canSend = settings?.can_send ?? false;

  async function submit(mode: "draft" | "send") {
    setError(null);
    setSubmitting(mode);

    const results = await Promise.allSettled(
      targets.map(async (item, index) => {
        const created = await createSourcing.mutateAsync({
          product_id: productId,
          company_id: item.company_id,
          tender_id: tenderId,
          supplier_product_id: item.supplier_product_id,
          contact_person_id: contactByCompany[item.company_id] || null,
          required_quantity: quantity.trim() || null,
          quantity_unit: quantityUnit.trim() || null,
          required_specification: item.specification,
          required_documents: asks.size > 0 ? Array.from(asks) : null,
          notes: notes.trim() || null,
        });
        if (mode === "draft") return;

        const message = messageFor(index);
        const to = splitRecipients(message.to);
        if (!to.length) {
          throw new Error(`No email address for ${item.company_name} — it stayed a draft.`);
        }
        // The request is already filed at this point. A send that fails leaves
        // a draft behind rather than nothing, which is the right remainder:
        // the enquiry is on the board and can be mailed from Sourcing.
        await sendInquiry.mutateAsync({
          requestId: created.id,
          payload: { to, subject: message.subject.trim(), body: message.body },
        });
      }),
    );
    setSubmitting(null);

    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    const succeeded = results.length - rejected.length;

    if (succeeded === 0) {
      setError(describeFailure(rejected[0]?.reason, mode));
      return;
    }
    if (rejected.length === 0) {
      toast.success(
        mode === "send"
          ? `Enquiry sent to ${succeeded === 1 ? targets[0].company_name : `${succeeded} suppliers`} for "${productName}"`
          : `Drafted ${succeeded === 1 ? "an enquiry" : `${succeeded} enquiries`} for "${productName}"`,
        { duration: 6000 },
      );
    } else {
      toast.error(
        `${succeeded} of ${results.length} ${mode === "send" ? "sent" : "drafted"} — ${describeFailure(rejected[0].reason, mode)}`,
        { duration: 8000 },
      );
    }
    onCreated();
  }

  if (!open || typeof document === "undefined") return null;

  const activeIndex = Math.max(
    0,
    targets.findIndex((item) => item.id === activeId),
  );
  const active = messageFor(activeIndex);
  const activeTarget = targets[activeIndex];
  const busy = submitting !== null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-md"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-enquiry-title"
        className="relative flex h-[88vh] w-[80vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="start-enquiry-title" className="text-base font-bold text-foreground">
              Send Enquiry
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {productName}
              {targets.length > 1 && ` · ${targets.length} suppliers`}
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

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left — what is being asked. */}
          <div className="min-h-0 shrink-0 space-y-5 overflow-y-auto border-b border-border px-6 py-5 lg:w-[400px] lg:border-b-0 lg:border-r">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <section className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {targets.length === 1 ? "Supplier" : `Suppliers (${targets.length})`}
              </p>
              {targets.map((item) => (
                <SupplierTarget
                  key={item.id}
                  item={item}
                  active={targets.length > 1 && item.id === activeTarget?.id}
                  edited={Boolean(overrides[item.id])}
                  selectedContactId={contactByCompany[item.company_id] ?? ""}
                  onChangeContact={(contactId) =>
                    setContactByCompany((current) => ({
                      ...current,
                      [item.company_id]: contactId,
                    }))
                  }
                  onSelect={() => setActiveId(item.id)}
                />
              ))}
            </section>

            <section className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Quantity to quote
              </p>
              <div className="flex gap-2">
                <Input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="decimal"
                  placeholder="500"
                  aria-label="Quantity"
                  className="h-9 flex-1 text-sm"
                />
                <Select
                  value={quantityUnit}
                  onChange={(event) => setQuantityUnit(event.target.value)}
                  aria-label="Unit"
                  className="h-9 w-28 shrink-0 text-xs"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Saved on the enquiry, not back onto the tender — the quantity that was
                quoted against is the one that went out in the email.
              </p>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Ask the supplier to confirm
              </p>
              <AskGrid
                group="terms"
                asks={asks}
                onToggle={toggleAsk}
                columns="grid-cols-2"
              />
              <p className="pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Documents to attach
              </p>
              <AskGrid
                group="documents"
                asks={asks}
                onToggle={toggleAsk}
                columns="grid-cols-2"
              />
            </section>

            <section className="space-y-1.5">
              <label
                htmlFor="enquiry-notes"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Notes to the supplier (optional)
              </label>
              <textarea
                id="enquiry-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything specific to ask this supplier"
                className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <p className="text-[11px] font-medium text-muted-foreground">
                Added to the email above the sign-off, and saved on the enquiry.
              </p>
            </section>
          </div>

          {/* Right — what the supplier will read. */}
          <div className="flex min-h-0 flex-1 flex-col bg-secondary/25">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-6 py-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
              <p className="text-xs font-bold text-foreground">Email preview</p>
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
                {settings?.account
                  ? `From ${settings.account.email_address}`
                  : "No mailbox connected"}
              </p>
              {active.edited && (
                <button
                  type="button"
                  onClick={() => resetToTemplate(activeTarget.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="size-3" strokeWidth={2.5} />
                  Reset to template
                </button>
              )}
            </div>

            {targets.length > 1 && (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/60 px-6 py-2">
                {targets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                      item.id === activeTarget?.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className="max-w-[160px] truncate">{item.company_name}</span>
                    {overrides[item.id] && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {active.loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Preparing the email…
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
                {!canSend && <MailboxNotice settings={settings} />}
                {active.warnings.map((warning) => (
                  <Notice key={warning}>{warning}</Notice>
                ))}
                {active.edited && (
                  <Notice tone="info">
                    You&rsquo;ve edited this message, so the checklist no longer rewrites
                    it. Reset to template to go back.
                  </Notice>
                )}

                <Field label="To">
                  <Input
                    value={active.to}
                    onChange={(event) =>
                      edit(activeTarget.id, "to", event.target.value)
                    }
                    placeholder="sales@factory.cn"
                    autoComplete="off"
                    className="h-9 bg-card text-xs"
                  />
                </Field>
                <Field label="Subject">
                  <Input
                    value={active.subject}
                    onChange={(event) =>
                      edit(activeTarget.id, "subject", event.target.value)
                    }
                    maxLength={500}
                    className="h-9 bg-card text-xs"
                  />
                </Field>

                <label className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Message
                  </span>
                  <textarea
                    value={active.body}
                    onChange={(event) =>
                      edit(activeTarget.id, "body", event.target.value)
                    }
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-card px-4 py-3 font-mono text-xs leading-relaxed text-foreground shadow-sm outline-none transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <p className="text-[11px] font-medium text-muted-foreground">
            Sent as plain text from the connected mailbox — replies land back on the
            enquiry.
          </p>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit("draft")}
              disabled={busy}
            >
              {submitting === "draft" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileText />
              )}
              Draft Enquiry
            </Button>
            <Button
              type="button"
              onClick={() => submit("send")}
              disabled={busy || !canSend || active.loading}
              title={canSend ? undefined : "Connect a Gmail account in Settings → Email Config"}
            >
              {submitting === "send" ? <Loader2 className="animate-spin" /> : <Send />}
              {targets.length === 1 ? "Send Enquiry" : `Send ${targets.length} Enquiries`}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** The weekly Gmail re-auth is the likeliest failure on the send path and has
 *  its own remedy, so it never reaches the buyer as a raw error string. */
function describeFailure(reason: unknown, mode: "draft" | "send"): string {
  if (isMailboxReauthError(reason)) {
    return "The Gmail connection expired — reconnect it in Settings → Email Config. The enquiry was filed as a draft.";
  }
  if (reason instanceof ApiError) return reason.message;
  if (reason instanceof Error) return reason.message;
  return mode === "send"
    ? "Could not send this enquiry. Is the API running?"
    : "Could not draft this enquiry. Is the API running?";
}

/**
 * Why Send is disabled, named precisely.
 *
 * Three different problems wear the same "can_send: false" — the server has no
 * Gmail client credentials, the credentials exist but nobody has run the
 * consent flow, or the grant has lapsed. They have three different fixes, and
 * one message covering all of them sends the buyer to a settings screen that
 * turns out to have nothing for him to click. The middle case is the common
 * one: registering the Gmail API and pasting a client id is not the same as
 * authorising a mailbox, and there is no way to tell from the outside.
 */
function MailboxNotice({ settings }: { settings: MailboxSettings | undefined }) {
  if (!settings) return null;

  if (!settings.configured) {
    return (
      <Notice>
        Gmail isn&rsquo;t configured on the server — <code>GMAIL_CLIENT_ID</code> and{" "}
        <code>GMAIL_CLIENT_SECRET</code> are unset. You can still save this as a draft.
      </Notice>
    );
  }
  if (!settings.account) {
    return (
      <Notice>
        Gmail is configured, but no mailbox has been authorised yet — that is a
        one-time consent at{" "}
        <SettingsLink>Settings → Email Config</SettingsLink>. You can still save this
        as a draft.
      </Notice>
    );
  }
  return (
    <Notice>
      The Gmail grant for {settings.account.email_address} has lapsed — Google expires
      it every 7 days on a Testing-mode app. Reconnect at{" "}
      <SettingsLink>Settings → Email Config</SettingsLink>. You can still save this as
      a draft.
    </Notice>
  );
}

function SettingsLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/settings?tab=email"
      className="font-bold underline underline-offset-2 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function AskGrid({
  group,
  asks,
  onToggle,
  columns,
}: {
  group: "terms" | "documents";
  asks: Set<string>;
  onToggle: (value: string) => void;
  columns: string;
}) {
  return (
    <div className={cn("grid gap-2", columns)}>
      {CHECKLIST.filter((ask) => ask.group === group).map((ask) => (
        <label
          key={ask.value}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
        >
          <Checkbox checked={asks.has(ask.value)} onChange={() => onToggle(ask.value)} />
          {ask.label}
        </label>
      ))}
    </div>
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

function Notice({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "info";
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : undefined}
      className={cn(
        "flex shrink-0 items-start gap-2 rounded-xl border p-2.5 text-[11px] font-medium leading-relaxed",
        tone === "warning"
          ? "border-warning/30 bg-warning/10 text-warning-foreground"
          : "border-border/60 bg-card text-muted-foreground",
      )}
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function SupplierTarget({
  item,
  active,
  edited,
  selectedContactId,
  onChangeContact,
  onSelect,
}: {
  item: EnquiryTarget;
  active: boolean;
  edited: boolean;
  selectedContactId: number | "";
  onChangeContact: (contactId: number | "") => void;
  onSelect: () => void;
}) {
  const { data } = useContacts({ company_id: item.company_id, size: 50 });
  const contacts = data?.items ?? [];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "space-y-2 rounded-xl border px-3.5 py-2.5 transition-colors",
        active
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border/60 bg-secondary/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {item.company_name}
        </p>
        {edited && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            Edited
          </span>
        )}
      </div>
      {item.country && (
        <p className="-mt-1 text-[11px] font-medium text-muted-foreground">{item.country}</p>
      )}
      <Select
        value={selectedContactId}
        onChange={(event) => onChangeContact(event.target.value ? Number(event.target.value) : "")}
        aria-label={`Contact at ${item.company_name}`}
        className="h-9 text-xs"
      >
        <option value="">No contact — use the company address</option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.name_en}
            {contact.is_primary ? " (Primary)" : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
