"use client";

import { Building2, CheckCircle2, Factory, Users } from "lucide-react";
import { useCompanyStats } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The four header tiles: how big the supplier network is, and how it breaks
 * down. Manufacturers and Traders/Agents partition the total the same way
 * the Type filter does — see CompanyService.stats on the backend.
 */
export function CompanyStatCards() {
  const { data, isPending, error } = useCompanyStats();

  // Context, not the page's payload — if the aggregate fails the table below
  // is still perfectly usable on its own.
  if (error) return null;

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[104px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  const pct = (count: number) =>
    data.total > 0 ? Math.round((count / data.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile
        icon={Building2}
        tile="bg-tile-blue-bg text-tile-blue ring-tile-blue/15"
        label="Total Companies"
        value={data.total}
        caption={`Across ${data.country_count} ${data.country_count === 1 ? "country" : "countries"}`}
      />
      <StatTile
        icon={CheckCircle2}
        tile="bg-tile-green-bg text-tile-green ring-tile-green/15"
        label="Active Companies"
        value={data.active}
        caption={`${pct(data.active)}% of total`}
      />
      <StatTile
        icon={Factory}
        tile="bg-tile-purple-bg text-tile-purple ring-tile-purple/15"
        label="Manufacturers"
        value={data.manufacturers}
        caption={`${pct(data.manufacturers)}% of total`}
      />
      <StatTile
        icon={Users}
        tile="bg-tile-amber-bg text-tile-amber ring-tile-amber/15"
        label="Traders / Agents"
        value={data.traders_agents}
        caption={`${pct(data.traders_agents)}% of total`}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  tile,
  label,
  value,
  caption,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tile: string;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105 sm:size-12",
          tile,
        )}
      >
        <Icon className="size-5 sm:size-[22px]" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-[13px]">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-[28px] sm:leading-9">
          {value.toLocaleString()}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
          {caption}
        </p>
      </div>
    </div>
  );
}
