import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A single dashboard count tile (FR-DASH-01/02). */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group p-5 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-h-10 items-start text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {hint && (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          {hint}
        </p>
      )}
    </Card>
  );
}
