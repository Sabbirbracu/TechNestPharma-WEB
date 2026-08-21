"use client";

import { cn } from "@/lib/utils";

export type TenderTab = "all" | "mine" | "participated" | "awarded" | "cancelled";

const TABS: { value: TenderTab; label: string }[] = [
  { value: "all", label: "All Tenders" },
  { value: "mine", label: "My Tenders" },
  { value: "participated", label: "Participated" },
  { value: "awarded", label: "Awarded" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * "My Tenders" and "Participated" narrow by who touched the tender
 * (`scope`); "Awarded" and "Cancelled" narrow by its display bucket
 * (`display_status`) — two different filters that happen to share one tab
 * strip, because that is how a buyer thinks about "which tenders do I want
 * to see", not because they are the same kind of question underneath.
 */
export function TenderTabs({
  active,
  onChange,
}: {
  active: TenderTab;
  onChange: (tab: TenderTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-current={active === tab.value ? "page" : undefined}
          className={cn(
            "relative whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            active === tab.value
              ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
