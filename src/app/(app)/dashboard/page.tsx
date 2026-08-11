import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { TrendingUp, Activity } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      {/* Premium Dashboard Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg">
            <Activity className="size-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Real-time overview of your sourcing operations
            </p>
          </div>
        </div>
      </div>
      
      <DashboardContent />
    </>
  );
}
