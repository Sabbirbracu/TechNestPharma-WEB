"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ListChecks,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Undo2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import { shortReference } from "@/lib/tender-reference";
import {
  useAcceptAllSuggestions,
  useConfirmTender,
  useRematchTender,
  useUnpublishTender,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BuyerBadge } from "@/components/buyer-badge";
import { formatDate, formatMoney, formatTime, tenderHref } from "./notice-taxonomy";
import type { NoticeTender, TenderNoticeDetail } from "@/types/api";

/** The one time every row shares, or null when they differ.
 *
 *  An EDCL notice closes all its tenders at the same hour, so printing
 *  "11:00 AM" six times spends a column on a constant. When the times do
 *  differ — and they can — each row carries its own again. */
function sharedTime(values: (string | null)[]): string | null {
  const present = values.filter((value): value is string => Boolean(value));
  // Every row must have a time, not just every row that has one: hoisting a
  // time out of four rows onto a header above six would tell the reader that
  // the two blank ones close at an hour the notice never stated.
  if (present.length !== values.length) return null;
  const distinct = new Set(present);
  return distinct.size === 1 ? formatTime([...distinct][0]) : null;
}

/** The tenders inside this notice. Each row opens its own page — the item
 *  table is far too wide to live in a panel here. */
export function TenderTable({ notice }: { notice: TenderNoticeDetail }) {
  const tenders = notice.tenders;
  const closingAt = useMemo(
    () => sharedTime(tenders.map((tender) => tender.closing_time)),
    [tenders],
  );
  const openingAt = useMemo(
    () => sharedTime(tenders.map((tender) => tender.opening_time)),
    [tenders],
  );

  if (tenders.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No tenders read from this notice yet. Press{" "}
          <span className="font-bold text-foreground">Extract</span> to read the
          document.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Below lg the ten columns can't fit: one card per tender. The shared
          closing / opening hour, hoisted into the table header on desktop,
          goes on a line of its own above the cards. */}
      <div className="lg:hidden">
        {(closingAt || openingAt) && (
          <p className="border-b border-border/60 bg-secondary/30 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
            All tenders
            {closingAt && <> close at <span className="text-foreground">{closingAt}</span></>}
            {closingAt && openingAt && " and"}
            {openingAt && <> open at <span className="text-foreground">{openingAt}</span></>}
          </p>
        )}
        <ul className="divide-y divide-border/50">
          {tenders.map((tender, index) => (
            <TenderCard
              key={tender.id}
              serial={index + 1}
              noticeId={notice.id}
              tender={tender}
              showClosingTime={!closingAt}
              showOpeningTime={!openingAt}
            />
          ))}
        </ul>
      </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/60 align-top text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <th className="w-16 whitespace-nowrap px-4 py-2.5">Sl. No.</th>
            <th className="px-2 py-2.5">Tender No. &amp; Date</th>
            <th className="px-4 text-center py-2.5">Items</th>
            <th className="px-4 py-2.5">
              Closing Date
              {closingAt && (
                <span className="block font-semibold normal-case tracking-normal text-muted-foreground/80">
                  {closingAt}
                </span>
              )}
            </th>
            <th className="px-4 py-2.5">
              Opening Date
              {openingAt && (
                <span className="block font-semibold normal-case tracking-normal text-muted-foreground/80">
                  {openingAt}
                </span>
              )}
            </th>
            <th className="px-4 py-2.5">Schedule Cost</th>
            <th className="px-1 py-2.5">Suppliers</th>
            <th className="px-4 py-2.5">Mapped</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="w-16 px-4 py-2.5 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {tenders.map((tender, index) => (
            <TenderRow
              key={tender.id}
              serial={index + 1}
              noticeId={notice.id}
              tender={tender}
              showClosingTime={!closingAt}
              showOpeningTime={!openingAt}
            />
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function TenderRow({
  serial,
  noticeId,
  tender,
  showClosingTime,
  showOpeningTime,
}: {
  serial: number;
  noticeId: number;
  tender: NoticeTender;
  showClosingTime: boolean;
  showOpeningTime: boolean;
}) {
  const { settled, progress } = tenderState(tender);
  const reference = tender.reference_no?.trim();

  return (
    <tr className="group border-b border-border/40 transition last:border-0 hover:bg-secondary/90">
      {/* Position in the notice, not an id: the reader is checking this table
          against a printed page that numbers its tenders the same way. */}
      <td className="px-4 py-3 text-sm font-bold text-center tabular-nums text-muted-foreground">
        {serial}
      </td>
      <td className="px-2 py-3">
        <Link
          href={tenderHref(noticeId, tender.reference_no)}
          className="block"
        >
          {reference ? (
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              {/* The authority, abbreviated. Six references in one notice
                  differ only by a serial number, so the buyer is what makes a
                  row identifiable — and it matters more once tenders from two
                  authorities share a screen. */}
              <BuyerBadge buyerName={tender.buyer_name} />
              <span
                className="font-mono text-sm font-bold text-foreground group-hover:text-primary"
                title={reference}
              >
                {shortReference(reference)}
              </span>
            </span>
          ) : (
            /* The one field that blocks the whole notice — worth saying so on
               the row rather than only in the band above. */
            <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-warning-foreground">
              <AlertTriangle className="size-3.5 shrink-0" />
              No reference number
            </span>
          )}
          {/* The item-derived name: what tells this row from its neighbours. */}
          <span
            className="block max-w-72 truncate text-xs font-semibold text-foreground/80"
            title={tender.name}
          >
            {tender.name}
          </span>
          <span className="block text-[11px] font-medium text-muted-foreground">
            Dated {formatDate(tender.notice_date)}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
          {tender.item_count} items
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
        {formatDate(tender.closing_date)}
        {showClosingTime && tender.closing_time && (
          <span className="block text-[11px] text-muted-foreground">
            {formatTime(tender.closing_time)}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 text-center py-3 text-sm font-medium text-foreground">
        {formatDate(tender.opening_date)}
        {showOpeningTime && tender.opening_time && (
          <span className="block text-[11px] text-muted-foreground">
            {formatTime(tender.opening_time)}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
        {formatMoney(tender.schedule_cost, tender.schedule_currency)}
        {tender.schedule_cost_usd && (
          <span className="block text-[11px] text-muted-foreground">
            ≈ USD {tender.schedule_cost_usd}
          </span>
        )}
      </td>
      <td className="px-1 py-3 text-sm text-center font-bold tabular-nums text-foreground">
        {tender.selected_supplier_count}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            settled ? "text-success" : "text-muted-foreground",
          )}
        >
          {tender.mapped_count}/{tender.item_count}
        </span>
        <span className="mt-1 block h-1 w-14 overflow-hidden rounded-full bg-secondary">
          <span
            className={cn(
              "block h-full rounded-full",
              settled ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusPill tender={tender} />
      </td>
      <td className="px-4 py-3 text-center font-bold">
        <RowMenu noticeId={noticeId} tender={tender} />
      </td>
    </tr>
  );
}

function tenderState(tender: NoticeTender) {
  const settled =
    tender.item_count > 0 && tender.mapped_count === tender.item_count;
  const live = tender.notice_confirmed_at !== null;
  const progress =
    tender.item_count > 0
      ? Math.round((tender.mapped_count / tender.item_count) * 100)
      : 0;
  return { settled, live, progress };
}

function StatusPill({ tender }: { tender: NoticeTender }) {
  const { settled, live } = tenderState(tender);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset",
        live
          ? "bg-success/10 text-success ring-success/20"
          : settled
            ? "bg-primary/10 text-primary ring-primary/20"
            : "bg-warning/10 text-warning-foreground ring-warning/30",
      )}
    >
      {live ? "Live" : settled ? "Ready" : "Review"}
    </span>
  );
}

/** The phone / tablet counterpart of `TenderRow`. The whole card opens the
 *  tender; only the ⋯ menu sits outside the link. */
function TenderCard({
  serial,
  noticeId,
  tender,
  showClosingTime,
  showOpeningTime,
}: {
  serial: number;
  noticeId: number;
  tender: NoticeTender;
  showClosingTime: boolean;
  showOpeningTime: boolean;
}) {
  const { settled, progress } = tenderState(tender);
  const reference = tender.reference_no?.trim();

  return (
    <li className="relative">
      <Link
        href={tenderHref(noticeId, tender.reference_no)}
        className="block px-4 py-3.5 transition active:bg-secondary/60"
      >
        <div className="flex items-start gap-3">
          {/* Serial, as on the printed notice the reader is checking against. */}
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-bold tabular-nums text-muted-foreground">
            {serial}
          </span>
          <div className="min-w-0 flex-1">
            {/* pr-8 keeps the first line clear of the ⋯ menu above it. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
              {reference ? (
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <BuyerBadge buyerName={tender.buyer_name} />
                  <span
                    className="truncate font-mono text-sm font-bold text-foreground"
                    title={reference}
                  >
                    {shortReference(reference)}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-bold text-warning-foreground">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  No reference number
                </span>
              )}
              <StatusPill tender={tender} />
            </div>
            <p className="mt-1 line-clamp-2 pr-6 text-xs font-semibold break-words text-foreground/80">
              {tender.name}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              Dated {formatDate(tender.notice_date)}
            </p>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-secondary/40 px-3 py-2.5 text-xs sm:grid-cols-3">
              <CardFact label="Closing">
                {formatDate(tender.closing_date)}
                {showClosingTime && tender.closing_time && (
                  <span className="text-muted-foreground"> · {formatTime(tender.closing_time)}</span>
                )}
              </CardFact>
              <CardFact label="Opening">
                {formatDate(tender.opening_date)}
                {showOpeningTime && tender.opening_time && (
                  <span className="text-muted-foreground"> · {formatTime(tender.opening_time)}</span>
                )}
              </CardFact>
              <CardFact label="Schedule cost">
                {formatMoney(tender.schedule_cost, tender.schedule_currency)}
                {tender.schedule_cost_usd && (
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    ≈ USD {tender.schedule_cost_usd}
                  </span>
                )}
              </CardFact>
              <CardFact label="Items">
                {tender.item_count}
                <span className="font-medium text-muted-foreground">
                  {" · "}
                  {tender.selected_supplier_count} supplier
                  {tender.selected_supplier_count === 1 ? "" : "s"}
                </span>
              </CardFact>
              <div className="col-span-2 sm:col-span-2">
                <dt className="flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Mapped
                  <span
                    className={cn(
                      "text-xs tracking-normal tabular-nums normal-case",
                      settled ? "text-success" : "text-foreground",
                    )}
                  >
                    {tender.mapped_count}/{tender.item_count}
                  </span>
                </dt>
                <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-card">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      settled ? "bg-success" : "bg-primary",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Link>

      <div className="absolute top-3 right-2.5">
        <RowMenu noticeId={noticeId} tender={tender} />
      </div>
    </li>
  );
}

function CardFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold break-words text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Per-tender actions.
 *
 * These three endpoints have existed since the pipeline was built but had no
 * caller outside a tender's own page, so clearing six clean tenders meant six
 * round trips through six screens. A notice's tenders are reviewed at
 * different speeds — two can be ready to bid on while the rest still need
 * mapping — and this is the level where that difference is visible.
 */
function RowMenu({
  noticeId,
  tender,
}: {
  noticeId: number;
  tender: NoticeTender;
}) {
  const router = useRouter();
  const acceptAll = useAcceptAllSuggestions();
  const rematch = useRematchTender();
  const confirmOne = useConfirmTender();
  const unpublish = useUnpublishTender();

  const [confirming, setConfirming] = useState(false);

  const busy =
    acceptAll.isPending ||
    rematch.isPending ||
    confirmOne.isPending ||
    unpublish.isPending;
  const live = tender.notice_confirmed_at !== null;
  const hasReference = Boolean(tender.reference_no?.trim());
  const unsettled = tender.item_count - tender.mapped_count;

  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "That did not go through",
      { duration: 8000 },
    );

  return (
    <>
      {confirming && (
        <ConfirmDialog
          title="Take this tender off the board?"
          description={
            <>
              <span className="font-semibold text-foreground">
                {tender.reference_no}
              </span>{" "}
              disappears from the tenders page and goes back to being this
              notice&rsquo;s draft reading, editable again. Its shortlisted
              suppliers are kept, so confirming it later puts the bid back as it
              was.
            </>
          }
          confirmLabel="Unpublish"
          busy={unpublish.isPending}
          onConfirm={() =>
            unpublish.mutate(tender.id, {
              onSuccess: (result) => {
                toast.success(result.detail);
                setConfirming(false);
              },
              onError: (error) => {
                onError(error);
                setConfirming(false);
              },
            })
          }
          onCancel={() => setConfirming(false)}
        />
      )}

      <DropdownMenu
        trigger={({ ref, ...props }) => (
          <button
            ref={ref}
            type="button"
            {...props}
            aria-label={`Actions for ${tender.reference_no ?? "this tender"}`}
            className="inline-flex rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </button>
        )}
      >
        {(close) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                close();
                router.push(tenderHref(noticeId, tender.reference_no));
              }}
            >
              <ArrowUpRight />
              Open tender
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={busy || unsettled === 0}
              onClick={() => {
                close();
                acceptAll.mutate(tender.id, {
                  onSuccess: (result) => toast.success(result.detail),
                  onError,
                });
              }}
            >
              <ListChecks />
              Map all suggested
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={busy || unsettled === 0}
              onClick={() => {
                close();
                rematch.mutate(tender.id, {
                  onSuccess: (result) => toast.success(result.detail),
                  onError,
                });
              }}
            >
              <RefreshCw />
              Re-run matching
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* One slot, two directions. Publishing a bid and pulling it back
              are the same decision seen from either side, so they sit in the
              same place rather than one being a permanently greyed-out row. */}
            {live ? (
              <DropdownMenuItem
                destructive
                disabled={busy}
                onClick={() => {
                  close();
                  // Confirmed rather than fired from the menu: this one takes a
                  // bid off the board the client may already be working from,
                  // and the row it removes is somewhere else on the site, so
                  // nothing on this screen would show the mistake.
                  setConfirming(true);
                }}
              >
                <Undo2 />
                Unpublish from board
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={busy || !hasReference}
                title={
                  hasReference
                    ? undefined
                    : "Add a reference number first — it is how a bid is identified"
                }
                onClick={() => {
                  close();
                  confirmOne.mutate(tender.id, {
                    onSuccess: (result) => toast.success(result.detail),
                    onError,
                  });
                }}
              >
                <Check />
                Confirm this tender
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenu>
    </>
  );
}
