"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Calendar } from "lucide-react";
import { useDashboard, useDashboardTimeseries } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { DocumentsOverview } from "@/components/dashboard/documents-overview";
import { KpiRow } from "@/components/dashboard/kpi-row";
import {
  RecentManufacturers,
  RecentProducts,
  RecentSamples,
} from "@/components/dashboard/recent-cards";
import { TopCategories } from "@/components/dashboard/top-categories";
import type { DashboardSeries, DashboardSeriesKey } from "@/types/api";

/**
 * The dashboard (FR-DASH).
 *
 * Four requests, all in parallel, and three of them are keys other pages
 * already populate: `/products/stats` is the products header's own query, and
 * the two "recent" lists are ordinary `size=5` list calls. Only the KPI row and
 * the growth chart needed anything new, and they share a single
 * `/dashboard/timeseries` call between them; the samples feed and the document
 * counts ride along on the existing `/dashboard` response rather than adding
 * routes of their own.
 *
 * The range selector lives on the Business Overview card but drives the KPI
 * tiles too, since both read the same series — moving it refetches one query.
 */
export function DashboardContent() {
  const [windowDays, setWindowDays] = useState(30);
  const timeseries = useDashboardTimeseries(windowDays);
  const dashboard = useDashboard();
  const { user } = useAuth();

  const series = useMemo(() => {
    if (!timeseries.data) return null;
    return new Map<DashboardSeriesKey, DashboardSeries>(
      timeseries.data.series.map((entry) => [entry.key, entry]),
    );
  }, [timeseries.data]);

  const range = timeseries.data
    ? `${formatBound(timeseries.data.from_date)} – ${formatBound(timeseries.data.to_date)}`
    : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Welcome back
            {user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! Here&apos;s
            what&apos;s happening with your business.
          </p>
        </div>

        {range && (
          <span className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
            <Calendar className="size-4 text-muted-foreground" strokeWidth={2} />
            <span className="tabular-nums">{range}</span>
          </span>
        )}
      </div>

      {timeseries.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-destructive"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Could not load the trend data
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {timeseries.error instanceof Error
                ? timeseries.error.message
                : "Unexpected error."}{" "}
              The cards below are unaffected.
            </p>
          </div>
        </div>
      )}

      <KpiRow
        series={series}
        windowDays={timeseries.data?.window_days ?? windowDays}
        isPending={timeseries.isPending}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <GrowthChart
            series={series}
            windowDays={windowDays}
            onWindowChange={setWindowDays}
            isPending={timeseries.isPending}
            isFetching={timeseries.isFetching}
          />
        </div>
        <div className="md:col-span-1 xl:col-span-3">
          <TopCategories />
        </div>
        <div className="md:col-span-1 xl:col-span-3">
          <RecentManufacturers />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentProducts />
        <RecentSamples
          samples={dashboard.data?.recent_samples}
          isPending={dashboard.isPending}
          error={Boolean(dashboard.error)}
        />
        <DocumentsOverview
          byType={dashboard.data?.documents_by_type}
          total={dashboard.data?.counts.documents ?? 0}
          isPending={dashboard.isPending}
          error={Boolean(dashboard.error)}
        />
      </div>
    </div>
  );
}

function formatBound(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
