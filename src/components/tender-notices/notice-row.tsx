import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { NOTICE_STATUS_LABEL, NOTICE_STATUS_STYLE, formatDate } from "./notice-taxonomy";
import type { TenderNoticeListItem } from "@/types/api";

export function NoticeRow({
  notice,
  selected,
  onToggle,
}: {
  notice: TenderNoticeListItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const progress =
    notice.item_count > 0
      ? Math.round((notice.mapped_count / notice.item_count) * 100)
      : 0;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card pl-4 transition",
        selected
          ? "border-primary/50 bg-primary/[0.04]"
          : "border-border/60 hover:border-primary/40 hover:shadow-sm",
      )}
    >
      {/* Outside the link, or ticking a row would navigate away from it. */}
      <Checkbox
        checked={selected}
        onChange={onToggle}
        aria-label={`Select ${notice.title}`}
      />

      <Link
        href={`/tender-notices/${notice.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 py-4 pr-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <FileText className="size-[18px]" strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {notice.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                NOTICE_STATUS_STYLE[notice.status],
              )}
            >
              {NOTICE_STATUS_LABEL[notice.status]}
            </span>
          </div>
          {/* Source, when it was published, the site's own tender number, and
              how many tenders are inside. The item count is deliberately NOT
              here: items belong to a tender, not to the notice, so "1 tender ·
              4 items" invited the row to be read as though the notice held
              four of something at its own level. The count that means
              something at this level is the tender count, and the mapping bar
              on the right already says how many lines are settled. */}
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            {notice.source_name ?? "Unknown source"}
            {notice.notice_date
              ? ` · Published: ${formatDate(notice.notice_date)}`
              : ""}
            {notice.source_refs.length > 0
              ? ` · Tender No: ${notice.source_refs.join(", ")}`
              : ""}
            {notice.tender_count > 0
              ? ` · ${notice.tender_count} Tender${notice.tender_count === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        {notice.item_count > 0 && (
          <div className="hidden w-36 shrink-0 sm:block">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span>Mapped</span>
              <span className="tabular-nums">
                {notice.mapped_count}/{notice.item_count}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress === 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
