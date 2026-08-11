"use client";

import {
  Building2,
  Users,
  FlaskConical,
  Handshake,
  FileText,
  TestTube2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "@/lib/queries";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardStats, LabelledCount } from "@/types/api";

const TILES: {
  key: keyof DashboardStats["counts"];
  label: string;
  icon: LucideIcon;
  variant: "primary" | "success";
}[] = [
  { key: "companies", label: "Companies", icon: Building2, variant: "primary" },
  { key: "contacts", label: "Contacts", icon: Users, variant: "success" },
  { key: "products", label: "Products", icon: FlaskConical, variant: "primary" },
  { key: "offers", label: "Offers", icon: Handshake, variant: "success" },
  { key: "documents", label: "Documents", icon: FileText, variant: "primary" },
  { key: "open_samples", label: "Open Samples", icon: TestTube2, variant: "success" },
];

function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function DashboardContent() {
  const { data, isLoading, error } = useDashboard();

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 shadow-sm"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="size-5" strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">Could not load the dashboard</p>
          <p className="text-xs font-medium text-muted-foreground">
            {error instanceof Error ? error.message : "Unexpected error."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Quick Stats Section - Mobile Optimized */}
      <section>
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <TrendingUp className="size-4 text-primary sm:size-5" strokeWidth={2} />
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Quick Statistics
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {TILES.map(({ key, label, icon, variant }) => (
            <StatCard
              key={key}
              label={label}
              icon={icon}
              variant={variant}
              value={
                isLoading ? "…" : (data?.counts[key] ?? 0).toLocaleString()
              }
            />
          ))}
        </div>
      </section>

      {/* Analytics Section - Mobile Optimized */}
      <section>
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <Globe className="size-4 text-success sm:size-5" strokeWidth={2} />
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Analytics Overview
          </h2>
        </div>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <BreakdownCard
            title="Offers by Material Type"
            description="Distribution of products across material categories"
            rows={data?.offers_by_material_type}
            isLoading={isLoading}
            emptyLabel="No offers data available"
            variant="primary"
          />
          <BreakdownCard
            title="Companies by Country"
            description="Geographic distribution of your supplier network"
            rows={data?.companies_by_country}
            isLoading={isLoading}
            emptyLabel="No company data available"
            variant="success"
          />
        </div>
      </section>
    </div>
  );
}

/** Premium breakdown card with refined visual hierarchy and enhanced progress bars. */
function BreakdownCard({
  title,
  description,
  rows,
  isLoading,
  emptyLabel,
  variant = "primary",
}: {
  title: string;
  description: string;
  rows: LabelledCount[] | undefined;
  isLoading: boolean;
  emptyLabel: string;
  variant?: "primary" | "success";
}) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.count));

  const gradientClass = variant === "success" 
    ? "from-success to-success/80" 
    : "from-primary to-primary-hover";
  
  const countClass = variant === "success"
    ? "text-success"
    : "text-primary";

  const iconBgClass = variant === "success"
    ? "bg-success/10 text-success ring-success/20"
    : "bg-primary/10 text-primary ring-primary/20";

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-card/98 shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold tracking-tight">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm font-medium">{description}</CardDescription>
          </div>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1", iconBgClass)}>
            {variant === "success" ? (
              <Globe className="size-5" strokeWidth={2} />
            ) : (
              <TrendingUp className="size-5" strokeWidth={2} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading data…</p>
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 py-8">
            <p className="text-sm font-medium text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.slice(0, 8).map((row, index) => (
              <li key={row.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">{humanise(row.label)}</span>
                  </div>
                  <span className={cn("shrink-0 text-base font-bold tabular-nums", countClass)}>
                    {row.count.toLocaleString()}
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-secondary shadow-inner ring-1 ring-inset ring-border/30"
                  role="presentation"
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-700 ease-out",
                      gradientClass
                    )}
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
