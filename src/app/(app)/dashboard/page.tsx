import type { Metadata } from "next";
import {
  Building2,
  Users,
  FlaskConical,
  Handshake,
  FileText,
  TestTube2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder totals until the /dashboard API (FR-DASH-01/02) is wired up.
const COUNTS = [
  { label: "Companies", value: "—", icon: Building2 },
  { label: "Contacts", value: "—", icon: Users },
  { label: "Products", value: "—", icon: FlaskConical },
  { label: "Offers", value: "—", icon: Handshake, hint: "By material type" },
  { label: "Documents", value: "—", icon: FileText },
  { label: "Open samples", value: "—", icon: TestTube2 },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="At-a-glance totals across the sourcing catalogue."
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {COUNTS.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Expiring soon
            </CardTitle>
            <CardDescription>
              Certifications and filings within 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nothing due right now.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube2 className="size-4" />
              Stale samples
            </CardTitle>
            <CardDescription>
              Open samples with no status change in 14+ days.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No open samples.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-destructive" />
              Data quality
            </CardTitle>
            <CardDescription>
              Companies without a contact, products without CAS, offers without
              a price.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nothing flagged.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently added companies</CardTitle>
            <CardDescription>The latest ten to enter the catalogue.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No companies yet.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent documents</CardTitle>
            <CardDescription>The ten most recent uploads.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No documents yet.
          </CardContent>
        </Card>
      </section>
    </>
  );
}
