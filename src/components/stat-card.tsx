import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 
 * Premium dashboard count tile with sophisticated hover effects and
 * refined visual hierarchy (FR-DASH-01/02).
 * Supports color variants for visual interest.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  variant = "primary",
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  variant?: "primary" | "success";
  className?: string;
}) {
  const colors = {
    primary: {
      accent: "from-primary/80 via-primary to-primary/80",
      iconBg: "bg-primary/8 text-primary ring-primary/10 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20",
      gradient: "group-hover:from-primary/5",
    },
    success: {
      accent: "from-success/80 via-success to-success/80",
      iconBg: "bg-success/8 text-success ring-success/10 group-hover:bg-success group-hover:text-success-foreground group-hover:ring-success/20",
      gradient: "group-hover:from-success/5",
    },
  };

  const colorClasses = colors[variant];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg",
        "border-border/60 bg-gradient-to-br from-card to-card/95",
        className,
      )}
    >
      {/* Top accent bar with smooth reveal */}
      <span className={cn(
        "absolute inset-x-0 top-0 h-[2px] scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100",
        colorClasses.accent
      )} />
      
      {/* Subtle gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:to-transparent group-hover:opacity-100",
        colorClasses.gradient
      )} />
      
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="text-sm font-medium text-muted-foreground leading-snug">
            {label}
          </span>
          <span className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-all duration-300 group-hover:scale-110",
            colorClasses.iconBg
          )}>
            <Icon className="size-5" strokeWidth={2} />
          </span>
        </div>
        
        <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground mb-1">
          {value}
        </div>
        
        {hint && (
          <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}
