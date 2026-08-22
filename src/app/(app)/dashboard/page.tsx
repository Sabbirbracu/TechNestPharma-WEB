import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      {/* Premium Dashboard Header - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5 mb-2 sm:gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg sm:size-12 sm:rounded-2xl">
            <Activity className="size-5 sm:size-6" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Real-time overview of your sourcing operations
            </p>
          </div>
        </div>
      </div>
      
      <DashboardContent />
    </>
  );
}
