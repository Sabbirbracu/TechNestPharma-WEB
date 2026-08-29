import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * A persistent select-all row that turns into bulk actions once something is
 * ticked — generic over whatever list it sits above (notices, products,
 * tenders, …), so the only thing a caller supplies is the noun.
 *
 * Deliberately one row that is always on screen, rather than a bar that pops
 * in on selection: a bar that appears shifts every row below it down by its
 * own height at the moment the reader is aiming at a checkbox.
 */
export function SelectionBar({
  total,
  count,
  allSelected,
  someSelected,
  onToggleAll,
  onClear,
  onDelete,
  deleting,
  itemLabel,
  itemLabelPlural,
}: {
  total: number;
  count: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  deleting: boolean;
  /** Singular noun for one selected row, e.g. "notice". */
  itemLabel: string;
  /** Plural noun, for when it doesn't just take an "s" (e.g. "enquiry" → "enquiries"). Defaults to `${itemLabel}s`. */
  itemLabelPlural?: string;
}) {
  const plural = itemLabelPlural ?? `${itemLabel}s`;

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-1.5 transition",
        count > 0 && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
      )}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={onToggleAll}
          aria-label={`Select all ${plural}`}
        />
        <span className="text-[11px] font-bold text-muted-foreground">
          {count > 0 ? (
            <>
              <span className="tabular-nums text-foreground">{count}</span>{" "}
              {count === 1 ? itemLabel : plural} selected
            </>
          ) : (
            <>
              Select all <span className="tabular-nums">({total})</span>
            </>
          )}
        </span>
      </label>

      {count > 0 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="h-7 text-xs"
          >
            {deleting ? (
              <Loader2 className="animate-spin" strokeWidth={2.25} />
            ) : (
              <Trash2 strokeWidth={2.25} />
            )}
            Delete selected
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={deleting}
            className="h-7 text-xs"
          >
            <X strokeWidth={2.25} />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
