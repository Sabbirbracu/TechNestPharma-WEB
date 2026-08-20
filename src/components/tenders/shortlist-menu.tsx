"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useAddTenderItem,
  useCreateTender,
  useRemoveTenderItem,
  useTenders,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ShortlistMembership, TenderListItem } from "@/types/api";

/**
 * The Shortlist control on a search result (FR-TENDER-02).
 *
 * The client works several government tenders at once, and the same molecule
 * routinely belongs on more than one of them. So this is a menu, not a toggle:
 * clicking Shortlist has to ask *which bid*, and the answer can be more than
 * one. A plain on/off button would silently collapse "needed for the DGDA bid"
 * and "needed for the eye-drop bid" into a single flag that neither tender
 * could read back.
 */

/** Row identity in the membership map: a shortlist entry is per (product,
 *  supplier), and a supplier-less line keys on the product alone. */
export function shortlistKey(productId: number, companyId: number | null): string {
  return `${productId}:${companyId ?? ""}`;
}

/** One page of search results' memberships, bucketed by row. */
export function groupMemberships(
  rows: ShortlistMembership[] | undefined,
): Map<string, ShortlistMembership[]> {
  const map = new Map<string, ShortlistMembership[]>();
  for (const row of rows ?? []) {
    const key = shortlistKey(row.product_id, row.company_id);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export type ShortlistMenuProps = {
  productId: number;
  companyId: number | null;
  /** The offer behind this card, stored on the tender line so it keeps the
   *  spec that was on screen. */
  offerId?: number | null;
  /** This row's memberships, sliced from the page-level fetch. */
  memberships: ShortlistMembership[];
  /** `full` is the card's stacked button; `compact` the dense list row. */
  variant?: "full" | "compact";
  className?: string;
};

export function ShortlistMenu({
  productId,
  companyId,
  offerId,
  memberships,
  variant = "full",
  className,
}: ShortlistMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = memberships.length;

  // Close on an outside click or Escape. Both listeners only exist while the
  // menu is open, so a page of 50 cards isn't 50 idle document listeners.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={
          count === 0
            ? "Add to a tender"
            : memberships.map((m) => m.tender_name).join(", ")
        }
        className={cn(
          "h-8 w-full gap-1.5 whitespace-nowrap rounded-sm px-2.5 text-[11px]",
          variant === "full" ? "flex-1 lg:flex-none" : "",
        )}
      >
        {count > 0 ? (
          <BookmarkCheck strokeWidth={2.25} />
        ) : (
          <Bookmark strokeWidth={2.25} />
        )}
        Shortlist
        <ChevronDown
          className={cn(
            "ml-auto transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </Button>

      {/* Mounted only while open: the tender list is fetched on first use, not
          once per card on every search. */}
      {open && (
        <ShortlistPanel
          productId={productId}
          companyId={companyId}
          offerId={offerId ?? null}
          memberships={memberships}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ShortlistPanel({
  productId,
  companyId,
  offerId,
  memberships,
  onClose,
}: {
  productId: number;
  companyId: number | null;
  offerId: number | null;
  memberships: ShortlistMembership[];
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClosing, setNewClosing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyTenderId, setBusyTenderId] = useState<number | null>(null);

  const { data, isLoading } = useTenders({
    size: 50,
    sort: "created_at",
    order: "desc",
  });
  const addItem = useAddTenderItem();
  const removeItem = useRemoveTenderItem();
  const createTender = useCreateTender();

  // Memoised so the empty-array fallback isn't a new identity every render,
  // which would make the filter below recompute on each keystroke elsewhere.
  const tenders = useMemo(() => data?.items ?? [], [data]);
  const onTender = useMemo(
    () => new Map(memberships.map((m) => [m.tender_id, m])),
    [memberships],
  );

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return tenders;
    return tenders.filter((tender) =>
      [tender.name, tender.reference_no, tender.buyer_name]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }, [tenders, filter]);

  async function toggle(tender: TenderListItem) {
    setError(null);
    setBusyTenderId(tender.id);
    const existing = onTender.get(tender.id);
    try {
      if (existing) {
        await removeItem.mutateAsync({
          tenderId: tender.id,
          itemId: existing.item_id,
        });
      } else {
        await addItem.mutateAsync({
          tenderId: tender.id,
          product_id: productId,
          company_id: companyId,
          supplier_product_id: offerId,
        });
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update the tender",
      );
    } finally {
      setBusyTenderId(null);
    }
  }

  /** Create and shortlist in one action — a buyer who opens this menu mid-search
   *  wants the row on the new tender, not an empty tender and a second click. */
  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const tender = await createTender.mutateAsync({
        name,
        closing_date: newClosing || null,
      });
      await addItem.mutateAsync({
        tenderId: tender.id,
        product_id: productId,
        company_id: companyId,
        supplier_product_id: offerId,
      });
      setNewName("");
      setNewClosing("");
      setCreating(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the tender",
      );
    }
  }

  return (
    <div
      role="menu"
      aria-label="Add to tender"
      className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-card text-left shadow-xl ring-1 ring-black/5"
    >
      <div className="border-b border-border/60 px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Add to tender
        </p>
      </div>

      {tenders.length > 6 && (
        <div className="relative border-b border-border/60 px-2 py-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            autoFocus
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Find a tender"
            className="h-8 w-full rounded-lg border border-input bg-background pl-7 pr-2 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </div>
      )}

      <div className="max-h-56 overflow-y-auto py-1">
        {isLoading ? (
          <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading tenders…
          </p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-3 text-xs italic text-muted-foreground">
            {tenders.length === 0
              ? "No tenders yet — create the first one below."
              : "No tender matches that."}
          </p>
        ) : (
          visible.map((tender) => {
            const active = onTender.has(tender.id);
            const busy = busyTenderId === tender.id;
            return (
              <button
                key={tender.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                disabled={busy}
                onClick={() => toggle(tender)}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/60 disabled:opacity-60"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active
                      ? "border-success bg-success text-success-foreground"
                      : "border-input bg-background",
                  )}
                >
                  {busy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : active ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {tender.name}
                  </span>
                  <span className="block truncate text-[10px] font-medium text-muted-foreground">
                    {[
                      tender.reference_no,
                      `${tender.item_count} item${tender.item_count === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {error && (
        <p className="border-t border-border/60 bg-destructive/5 px-3 py-2 text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="border-t border-border/60 p-2">
        {creating ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createAndAdd();
                }
              }}
              placeholder="Tender name"
              className="h-8 rounded-lg px-2.5 text-xs"
            />
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Closing date (optional)
              </span>
              <Input
                type="date"
                value={newClosing}
                onChange={(event) => setNewClosing(event.target.value)}
                className="mt-1 h-8 rounded-lg px-2.5 text-xs"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={createAndAdd}
                disabled={
                  !newName.trim() || createTender.isPending || addItem.isPending
                }
                className="h-8 flex-1 text-xs"
              >
                {createTender.isPending || addItem.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Create &amp; add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreating(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreating(true)}
              className="h-8 flex-1 justify-start gap-1.5 text-xs text-primary hover:bg-primary/10"
            >
              <Plus strokeWidth={2.5} />
              New tender
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-muted-foreground"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "In 2 tenders", shown under the row's actions when it is on at least one.
 *
 * Deliberately separate from the Shortlist button: the button is a verb the
 * buyer presses, and it should read the same on every row. Folding the count
 * into its label made a shortlisted row's primary action look like a different
 * control from an un-shortlisted one's.
 */
export function ShortlistChip({
  memberships,
  className,
}: {
  memberships: ShortlistMembership[];
  className?: string;
}) {
  if (memberships.length === 0) return null;
  const count = memberships.length;
  // One tender goes straight to it; several would have to pick, so the list.
  const href = count === 1 ? `/tenders/${memberships[0].tender_id}` : "/tenders";

  return (
    // className (sizing/positioning in the caller's layout) belongs on the
    // tooltip wrapper — it's the outward-facing box now, not the Link.
    <Tooltip
      className={cn("w-full", className)}
      content={
        <>
          <p className="mb-1 text-xs font-bold text-foreground">
            {count === 1 ? "Shortlisted on" : `Shortlisted on ${count} tenders`}
          </p>
          <ul className="space-y-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {memberships.map((m) => (
              <li key={m.tender_id}>{m.tender_name}</li>
            ))}
          </ul>
        </>
      }
    >
      <Link
        href={href}
        className="flex w-full items-center justify-center gap-1 rounded-sm bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20"
      >
        <BookmarkCheck className="size-3 shrink-0" strokeWidth={2.5} />
        <span className="truncate">
          In {count} {count === 1 ? "tender" : "tenders"}
        </span>
      </Link>
    </Tooltip>
  );
}
