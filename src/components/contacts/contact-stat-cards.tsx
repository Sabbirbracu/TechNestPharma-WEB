"use client";

import { Building2, Mail, RefreshCw, Star, Users } from "lucide-react";
import { useContactStats } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ContactStatBucket } from "@/types/api";

/**
 * The five header tiles. "Primary Contacts" stands in for the "Active
 * Contacts" slot in the reference design — a contact has no active/inactive
 * flag of its own (only a company does), but `is_primary` is a real,
 * per-contact fact already on file. Email Sent / Replies Received are real
 * `communication` rows tied to a named contact, not a company at large.
 */
export function ContactStatCards() {
  const { data, isPending, error } = useContactStats();

  if (error) return null;

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-[104px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatTile
        icon={Users}
        tile="bg-tile-blue-bg text-tile-blue ring-tile-blue/15"
        label="Total Contacts"
        bucket={data.total}
      />
      <StatTile
        icon={Star}
        tile="bg-tile-green-bg text-tile-green ring-tile-green/15"
        label="Primary Contacts"
        bucket={data.primary}
      />
      <StatTile
        icon={Building2}
        tile="bg-tile-purple-bg text-tile-purple ring-tile-purple/15"
        label="Companies"
        bucket={data.companies}
      />
      <StatTile
        icon={Mail}
        tile="bg-tile-amber-bg text-tile-amber ring-tile-amber/15"
        label="Email Sent"
        bucket={data.emails_sent}
      />
      <StatTile
        icon={RefreshCw}
        tile="bg-tile-green-bg text-tile-green ring-tile-green/15"
        label="Replies Received"
        bucket={data.replies_received}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  tile,
  label,
  bucket,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tile: string;
  label: string;
  bucket: ContactStatBucket;
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
          {bucket.count.toLocaleString()}
        </p>
        {bucket.delta_pct !== null && (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-success sm:text-xs">
            {bucket.delta_pct >= 0 ? "↑" : "↓"} {Math.abs(bucket.delta_pct)}%{" "}
            <span className="font-medium text-muted-foreground">vs last 30 days</span>
          </p>
        )}
      </div>
    </div>
  );
}
