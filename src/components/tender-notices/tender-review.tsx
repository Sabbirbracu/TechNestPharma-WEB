"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  Coins,
  FlaskConical,
  Loader2,
  MoreVertical,
  Pencil,
  RefreshCw,
  ScanSearch,
  Search,
  SkipForward,
  Sparkles,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { BuyerBadge } from "@/components/buyer-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  useAcceptAllSuggestions,
  useAcceptSuggestion,
  useConfirmTender,
  useDeleteNoticeItem,
  useItemCandidates,
  useMapItem,
  useRematchTender,
  useSetItemSuppliers,
  useTenderNotice,
  useUpdateNoticeItem,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ItemNameCheckDialog } from "./item-name-check-dialog";
import { ProductSearchDialog } from "./product-search-dialog";
import {
  MAPPING_STATUS_LABEL,
  MAPPING_STATUS_STYLE,
  MATCH_METHOD_LABEL,
  confidenceTone,
  formatDate,
  formatMoney,
  formatTime,
  isGuessedText,
} from "./notice-taxonomy";
import type {
  ItemSupplier,
  NoticeTender,
  NoticeTenderItem,
  TenderNoticeDetail,
} from "@/types/api";

/**
 * One tender's requirement lines, on a page of its own.
 *
 * Split out of the notice screen because the table is genuinely wide — raw
 * name, specification, matched product, confidence, and a supplier list that
 * can run to eight companies — and a panel underneath the notice's own tender
 * table left it about a third of the viewport. This page gives the whole width
 * to the thing the buyer actually works in.
 *
 * The tender is read out of the notice payload rather than fetched on its own:
 * the notice query is already cached from the screen the user just came from,
 * and a notice carries six tenders, not six hundred.
 */
export function TenderReview({
  noticeId,
  reference,
}: {
  noticeId: number;
  reference: string;
}) {
  const { data: notice, isPending } = useTenderNotice(noticeId);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading tender…
      </div>
    );
  }

  const tender = notice?.tenders.find(
    (row) => (row.reference_no ?? "") === reference,
  );

  if (!notice || !tender) {
    return (
      <div className="space-y-3 p-8">
        <p className="text-sm font-medium text-foreground">
          No tender <span className="font-mono font-bold">{reference}</span> in
          this notice.
        </p>
        <Link
          href={`/tender-notices/${noticeId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to the notice
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TenderHeader
        noticeId={noticeId}
        noticeTitle={notice.title}
        tender={tender}
        ocr={isGuessedText(notice.extraction_method)}
      />
      <TenderItems notice={notice} tender={tender} />
    </div>
  );
}

/** Reference number, the notice it came from, and the tender's own facts. */
function TenderHeader({
  noticeId,
  noticeTitle,
  tender,
  ocr,
}: {
  noticeId: number;
  noticeTitle: string;
  tender: NoticeTender;
  ocr: boolean;
}) {
  const live = tender.notice_confirmed_at !== null;

  // One card each, with an icon: these are four different kinds of fact, and
  // the deadline is not read the same way as a fee.
  const facts: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    {
      label: "Closing",
      value: `${formatDate(tender.closing_date)} ${formatTime(tender.closing_time)}`.trim(),
      icon: CalendarClock,
      tone: "bg-destructive/10 text-destructive ring-destructive/15",
    },
    {
      label: "Opening",
      value: `${formatDate(tender.opening_date)} ${formatTime(tender.opening_time)}`.trim(),
      icon: CalendarCheck,
      tone: "bg-success/10 text-success ring-success/15",
    },
    {
      label: "Schedule cost",
      value:
        formatMoney(tender.schedule_cost, tender.schedule_currency) +
        (tender.schedule_cost_usd ? ` (≈ USD ${tender.schedule_cost_usd})` : ""),
      icon: Coins,
      tone: "bg-warning/10 text-warning-foreground ring-warning/20",
    },
    {
      label: "Notice date",
      value: formatDate(tender.notice_date),
      icon: CalendarDays,
      tone: "bg-primary/10 text-primary ring-primary/15",
    },
  ];

  return (
    <header className="space-y-3">
      <Link
        href={`/tender-notices/${noticeId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {noticeTitle}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        {/* Which authority's tender this is — the reference number alone does
            not say, and its neighbours in the notice differ only by a serial. */}
        <BuyerBadge
          buyerName={tender.buyer_name}
          className="rounded-lg px-2 py-1 text-sm"
        />
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {tender.reference_no ?? tender.name}
        </h1>
        {live && (
          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success ring-1 ring-inset ring-success/20">
            Live on tender board
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 transition hover:border-border hover:shadow-sm"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                tone,
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-foreground">
                {value || "—"}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {ocr && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-[11px] font-medium leading-relaxed text-warning-foreground"
        >
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            This notice was read by OCR, so every figure above is a guess rather
            than a read. Check them against the document before confirming.
          </span>
        </div>
      )}
    </header>
  );
}

function TenderItems({
  notice,
  tender,
}: {
  notice: TenderNoticeDetail;
  tender: NoticeTender;
}) {
  const [checking, setChecking] = useState(false);
  const acceptAll = useAcceptAllSuggestions();
  const rematch = useRematchTender();
  const confirmTender = useConfirmTender();

  const suggested = tender.items.filter(
    (item) => item.mapping_status === "suggested",
  ).length;
  const done = tender.mapped_count === tender.item_count && tender.item_count > 0;
  const live = tender.notice_confirmed_at !== null;

  return (
    <section className="overflow-hidden rounded-xl border border-success/25 bg-success/[0.02]">
      <ItemNameCheckDialog
        notice={notice}
        tender={tender}
        open={checking}
        onClose={() => setChecking(false)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-bold text-success">
              Tender:{" "}
              <span className="font-mono">
                {tender.reference_no ?? tender.name}
              </span>
            </h3>
            <span className="text-sm font-semibold text-muted-foreground">
              · {tender.item_count} item{tender.item_count === 1 ? "" : "s"}
            </span>
            {/* "Verified" is derived, not stored: every line confirmed or
                skipped. It says the reading has been gone through, which is a
                different claim from "live on the board" below it. */}
            {done && (
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success ring-1 ring-inset ring-success/20">
                Verified
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {tender.mapped_count} settled · {tender.selected_supplier_count}{" "}
            supplier{tender.selected_supplier_count === 1 ? "" : "s"} ticked
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* First in the row because it is the first thing to do: every
              other button here acts on names nobody has checked yet. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChecking(true)}
            title="Read the extracted item names beside the notice they came from"
          >
            <ScanSearch />
            Check Names vs Doc
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              rematch.mutate(tender.id, {
                onSuccess: (result) => toast.success(result.detail),
              })
            }
            disabled={rematch.isPending}
            title="Re-run matching over unsettled lines, after the catalogue has changed"
          >
            {rematch.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Re-match
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              acceptAll.mutate(tender.id, {
                onSuccess: (result) => toast.success(result.detail),
              })
            }
            disabled={acceptAll.isPending || suggested === 0}
            title={
              suggested === 0
                ? "Nothing is awaiting confirmation on this tender"
                : `Confirm ${suggested} suggested item(s)`
            }
          >
            {acceptAll.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Map All &amp; Continue
          </Button>
          {/* Per-tender confirm. A notice's six tenders are reviewed at
              different speeds, so this promotes one without waiting for the
              rest — and carries its ticked suppliers onto the bid. */}
          <Button
            type="button"
            size="sm"
            variant="success"
            onClick={() =>
              confirmTender.mutate(tender.id, {
                onSuccess: (result) => toast.success(result.detail),
                onError: (error) =>
                  toast.error(
                    error instanceof ApiError
                      ? error.message
                      : "Could not confirm this tender",
                    { duration: 8000 },
                  ),
              })
            }
            disabled={confirmTender.isPending}
            title={
              live
                ? "Already live — confirming again tops up any newly ticked suppliers"
                : `Create this tender and shortlist ${tender.selected_supplier_count} supplier(s)`
            }
          >
            {confirmTender.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            {live ? "Re-sync Suppliers" : "Confirm This Tender"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto bg-card">
        <table className="w-full min-w-[1040px] table-fixed text-left">
          <thead>
            {/* Widths follow the work, not the content length. The four
                reading columns are scanned once and settled; Suppliers is
                where the buyer actually spends the review — ticking and
                unticking a list that can run to eight companies — so it takes
                the largest share, and Status and Actions get room to breathe
                beside it. */}
            <tr className="border-b border-border/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="w-12 px-3 py-2.5">SL</th>
              <th className="w-[16%] px-3 py-2.5">
                Raw Item Name
                <span className="ml-1 font-medium normal-case text-muted-foreground/70">
                  (as in notice)
                </span>
              </th>
              {/* "Spec." rather than the mockup's "Specification": the word does not
                  fit the narrow column and ran over the next header. */}
              <th className="w-16 px-3 py-2.5">Spec.</th>
              <th className="w-[18%] px-3 py-2.5">Suggested Match</th>
              <th className="w-24 px-3 py-2.5">Match Confidence</th>
              <th className="w-[30%] px-3 py-2.5">Supplier Candidates</th>
              <th className="w-28 px-3 py-2.5">Mapping Status</th>
              <th className="w-28 px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tender.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>

    </section>
  );
}

function ItemRow({ item }: { item: NoticeTenderItem }) {
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const accept = useAcceptSuggestion();
  const map = useMapItem();
  const removeItem = useDeleteNoticeItem();

  const confidence = item.match_confidence ? Number(item.match_confidence) : null;
  const settled =
    item.mapping_status === "confirmed" || item.mapping_status === "skipped";

  return (
    <>
      {item.matched_product && (
        <ProductSearchDialog
          initialQuery={item.matched_product.name_en}
          open={searching}
          onClose={() => setSearching(false)}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this line?"
          description={
            <>
              Line {String(item.line_no).padStart(2, "0")} —{" "}
              <strong className="font-semibold text-foreground">
                {item.raw_name}
              </strong>{" "}
              will be removed from this tender. Use this for a line the
              extractor invented; to keep a real line you do not trade, skip it
              instead.
            </>
          }
          confirmLabel="Delete line"
          busy={removeItem.isPending}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() =>
            removeItem.mutate(item.id, {
              onSuccess: () => setConfirmingDelete(false),
            })
          }
        />
      )}
      <tr className="border-b border-border/40 align-top transition-colors last:border-0 hover:bg-secondary/30">
        <td className="px-3 py-3 text-sm font-bold tabular-nums text-muted-foreground">
          {String(item.line_no).padStart(2, "0")}
        </td>
        <td className="px-3 py-3">
          {/* Verbatim from the notice — never rewritten by the matcher. It is
              the column a dispute gets checked against. */}
          <span className="block break-words text-sm font-bold text-foreground">
            {item.raw_name}
          </span>
        </td>
        <td className="px-3 py-3 text-sm font-medium text-muted-foreground">
          {item.specification ?? "—"}
        </td>
        <td className="px-3 py-3">
          {item.matched_product ? (
            <button
              type="button"
              onClick={() => setSearching(true)}
              title={`Look up ${item.matched_product.name_en} in the catalogue`}
              className="group/match flex w-full items-start gap-2 text-left"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success ring-1 ring-inset ring-success/15">
                <FlaskConical className="size-3.5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-bold text-success underline-offset-2 group-hover/match:underline">
                  {item.matched_product.name_en}
                </span>
                {item.matched_product.cas_number && (
                  <span className="block font-mono text-[11px] font-medium text-muted-foreground">
                    CAS: {item.matched_product.cas_number}
                  </span>
                )}
              </span>
            </button>
          ) : (
            /* The Status column already says "No match" in words; repeating
               the sentence here only cost the column its width. */
            <span
              className="text-sm font-medium text-muted-foreground"
              title="No match in the catalogue"
            >
              —
            </span>
          )}
        </td>
        <td className="px-3 py-3">
          {confidence !== null ? (
            <>
              <span className="block text-sm font-bold tabular-nums text-foreground">
                {confidence}%
              </span>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", confidenceTone(confidence))}
                  style={{ width: `${Math.min(confidence, 100)}%` }}
                />
              </div>
              {/* The method always travels with the score: "84%" alone is a
                  number nobody can argue with. Stacked rather than set beside
                  it, which is what let this column give up its width. */}
              {item.match_method && (
                <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                  {MATCH_METHOD_LABEL[item.match_method]}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">
              —
            </span>
          )}
        </td>
        <td className="px-3 py-3">
          <SupplierPicker item={item} />
        </td>
        <td className="px-3 py-3">
          <span
            className={cn(
              "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
              MAPPING_STATUS_STYLE[item.mapping_status],
            )}
          >
            {MAPPING_STATUS_LABEL[item.mapping_status]}
          </span>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            {/* The tick stays a button of its own: confirming the matcher's
                suggestion is the one action done to most rows in a pass, and
                burying it in a menu would cost a click on every line. */}
            {item.mapping_status === "suggested" && (
              <button
                type="button"
                onClick={() => accept.mutate(item.id)}
                disabled={accept.isPending}
                title="Confirm this match"
                className="inline-flex size-8 items-center justify-center rounded-lg border transition border-success/30 text-success hover:bg-success/10"
              >
                {accept.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-4" strokeWidth={2.5} />
                )}
              </button>
            )}

            <DropdownMenu
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label={`More actions for line ${item.line_no}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <MoreVertical className="size-4" strokeWidth={2.25} />
                </button>
              )}
            >
              {(close) => (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(true);
                      close();
                    }}
                  >
                    <Pencil />
                    Edit item
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setPicking(true);
                      close();
                    }}
                  >
                    <Search />
                    Choose another product
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    disabled={settled || map.isPending}
                    onClick={() => {
                      map.mutate({ itemId: item.id, skip: true });
                      close();
                    }}
                  >
                    <SkipForward />
                    {item.mapping_status === "skipped" ? "Already skipped" : "Skip"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    destructive
                    disabled={removeItem.isPending}
                    onClick={() => {
                      setConfirmingDelete(true);
                      close();
                    }}
                  >
                    <Trash2 />
                    Delete item
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-border/40 bg-secondary/30">
          <td colSpan={8} className="px-3 py-3">
            <ItemEditor item={item} onDone={() => setEditing(false)} />
          </td>
        </tr>
      )}
      {picking && (
        <tr className="border-b border-border/40 bg-secondary/30">
          <td colSpan={8} className="px-3 py-3">
            <CandidatePicker item={item} onDone={() => setPicking(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Every supplier that can serve this line, ticked by default.
 *
 *  Ticked rows become `tender_shortlist` entries when the tender is confirmed,
 *  which is what puts them on the tender's own detail page. Review is
 *  therefore "untick what I don't want" — with eight suppliers on
 *  Azithromycin, that is the difference between one click and eight.
 *
 *  Selections are sent as the FULL set, not a delta, so the request is
 *  idempotent.
 */
function SupplierPicker({ item }: { item: NoticeTenderItem }) {
  const setSuppliers = useSetItemSuppliers();
  const [expanded, setExpanded] = useState(false);

  if (item.matched_product_id === null) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Map a product first
      </span>
    );
  }
  if (item.suppliers.length === 0) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        No suppliers on file
      </span>
    );
  }

  const selected = item.suppliers.filter((s) => s.is_selected);
  const shown = expanded ? item.suppliers : item.suppliers.slice(0, 3);

  const toggle = (supplier: ItemSupplier) => {
    const next = item.suppliers
      .filter((candidate) =>
        candidate.supplier_product_id === supplier.supplier_product_id
          ? !candidate.is_selected
          : candidate.is_selected,
      )
      .map((candidate) => candidate.supplier_product_id);
    setSuppliers.mutate({ itemId: item.id, supplierProductIds: next });
  };

  return (
    <div className="space-y-1">
      {/* Same left edge as the checkboxes below it — the count reads as the
          heading of that list, not as something indented out of it. */}
      <span className="inline-flex items-center gap-1.5 px-1.5 text-[11px] font-bold text-muted-foreground">
        <Truck className="size-3.5" />
        {selected.length}/{item.suppliers.length} ticked
      </span>

      {/* One line per supplier now that the column is wide enough for it:
          company on the left, where the eye ticks; country and price on the
          right, where they line up down the list and can be compared. */}
      <ul className="space-y-0.5">
        {shown.map((supplier) => {
          const meta = supplier.price_min
            ? `${supplier.currency ?? ""} ${supplier.price_min}`.trim()
            : null;

          return (
            <li key={supplier.supplier_product_id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-secondary/60">
                <Checkbox
                  checked={supplier.is_selected}
                  onChange={() => toggle(supplier)}
                  disabled={setSuppliers.isPending}
                  className="size-3.5"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {supplier.company_name}
                </span>
                {meta && (
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground">
                    {meta}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {item.suppliers.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="px-1.5 text-[11px] font-bold text-muted-foreground underline-offset-2 hover:underline"
        >
          {expanded ? "Show fewer" : `+${item.suppliers.length - 3} more`}
        </button>
      )}
    </div>
  );
}

/** "Choose Another" — the alternatives the matcher found, ranked. */
/**
 * Correct a misread line, inline under the row it belongs to.
 *
 * Only the two columns that come straight off the notice are editable — the
 * raw name and the specification. Everything else in the row is derived: the
 * match, its confidence and the supplier list are the matcher's output, and
 * they are changed by re-matching, not by typing over them.
 *
 * Saving a changed `raw_name` makes the backend re-run matching (unless the
 * line is already confirmed), so the suggestion and confidence on screen can
 * both change when this closes. That is the point: the old suggestion was
 * drawn from text that has just been corrected.
 */
function ItemEditor({
  item,
  onDone,
}: {
  item: NoticeTenderItem;
  onDone: () => void;
}) {
  const update = useUpdateNoticeItem();
  const [rawName, setRawName] = useState(item.raw_name);
  const [specification, setSpecification] = useState(item.specification ?? "");

  const trimmedName = rawName.trim();
  const trimmedSpec = specification.trim();
  const changed =
    trimmedName !== item.raw_name || trimmedSpec !== (item.specification ?? "");
  const rematches = trimmedName !== item.raw_name && item.mapping_status !== "confirmed";

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedName || !changed) return;
    update.mutate(
      {
        itemId: item.id,
        raw_name: trimmedName,
        specification: trimmedSpec || null,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label className="min-w-0 flex-1 space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Raw Item Name
          </span>
          <Input
            value={rawName}
            onChange={(event) => setRawName(event.target.value)}
            maxLength={500}
            required
            autoFocus
            aria-label="Raw item name"
          />
        </label>

        <label className="w-full space-y-1 sm:w-56">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Specification
          </span>
          <Input
            value={specification}
            onChange={(event) => setSpecification(event.target.value)}
            maxLength={100}
            placeholder="—"
            aria-label="Specification"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={!trimmedName || !changed || update.isPending}>
          {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Save changes
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>

        {rematches && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Changing the name re-runs matching for this line.
          </span>
        )}
        {update.error && (
          <span className="text-[11px] font-semibold text-destructive">
            {update.error instanceof Error
              ? update.error.message
              : "Could not save this line."}
          </span>
        )}
      </div>
    </form>
  );
}

function CandidatePicker({
  item,
  onDone,
}: {
  item: NoticeTenderItem;
  onDone: () => void;
}) {
  const { data, isPending } = useItemCandidates(item.id);
  const map = useMapItem();

  if (isPending) {
    return (
      <span className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Searching the catalogue…
      </span>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-[11px] font-medium text-muted-foreground">
        Nothing in the catalogue resembles{" "}
        <span className="font-bold text-foreground">{item.raw_name}</span>. Add
        it as a product first, or skip this line — the notice may be asking for
        something you do not trade.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Candidates for “{item.raw_name}”
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {data.map((candidate) => (
          <li key={candidate.product_id}>
            <button
              type="button"
              onClick={() =>
                map.mutate(
                  { itemId: item.id, product_id: candidate.product_id },
                  {
                    onSuccess: () => {
                      toast.success(`Mapped to ${candidate.name}`);
                      onDone();
                    },
                  },
                )
              }
              disabled={map.isPending}
              className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-left transition hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="block text-[11px] font-bold text-foreground">
                {candidate.name}
              </span>
              <span className="block text-[10px] font-medium text-muted-foreground">
                {candidate.cas_number ? `CAS ${candidate.cas_number} · ` : ""}
                {candidate.confidence}% {MATCH_METHOD_LABEL[candidate.method]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- side panels --------------------------------------------------------- */

