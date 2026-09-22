"use client";

import { cn } from "@/lib/utils";

export type TenderTab = "all" | "cancelled" | "closed";

// My Tenders, Participated and Awarded were removed at the client's request
// (2026-09-21): this page lists the tenders the buyer has confirmed or wants
// to take part in, so those cuts no longer mean anything here.
const TABS: { value: TenderTab; label: string }[] = [
  { value: "all", label: "All Tenders" },
  { value: "cancelled", label: "Cancelled" },
  { value: "closed", label: "Closed" },
];

/** Each tab narrows by the tender's display bucket (`display_status`). */
export function TenderTabs({
  active,
  onChange,
}: {
  active: TenderTab;
  onChange: (tab: TenderTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-current={active === tab.value ? "page" : undefined}
          className={cn(
            "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-semibold sm:px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
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
