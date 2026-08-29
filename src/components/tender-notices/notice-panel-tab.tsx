import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A segmented control rather than the underline strip the tenders board uses.
 *
 * These three are not filters over one list — they are three different things
 * to look at, and only one is ever on screen. A raised, enclosed segment says
 * "you are in this one of three" more plainly than a 2px line, and the
 * enclosure keeps the group from reading as page-level navigation.
 */
export function PanelTab({
  active,
  onClick,
  icon: Icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-bold transition-all",
        active
          ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4", active ? "text-primary" : "text-muted-foreground")}
        strokeWidth={2.25}
      />
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
            active ? "bg-primary/10 text-primary" : "bg-border/60 text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
