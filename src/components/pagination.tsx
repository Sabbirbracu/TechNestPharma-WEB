"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Page controls for a `Page<T>` envelope. Hidden when everything fits on one page. */
export function Pagination({
  page,
  pages,
  total,
  size,
  onPageChange,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium tabular-nums">{first}</span>–
        <span className="font-medium tabular-nums">{last}</span> of{" "}
        <span className="font-medium tabular-nums">{total}</span>
      </p>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft />
            Previous
          </Button>
          <span className="px-1 text-xs tabular-nums text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
