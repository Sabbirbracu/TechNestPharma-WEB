import type { Metadata } from "next";
import { Settings, Tags, ScrollText, Building } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };

/**
 * Administration & audit (FR-ADM). V1 ships a single owner account with no
 * role-management UI; the panels below are the settings surfaces that do exist.
 */
const SECTIONS = [
  {
    icon: Building,
    title: "Company profile",
    body: "Your own company — name, logo, and address, used on the profile screen and report letterhead.",
  },
  {
    icon: Tags,
    title: "Category mapping",
    body: "The raw supplier category strings, each mapped onto material type, therapeutic area, market segment, and commercial status.",
  },
  {
    icon: ScrollText,
    title: "Activity log",
    body: "An append-only record of every create, update, delete, login, upload, and export — filterable by user, entity, and date.",
  },
  {
    icon: Settings,
    title: "Lookup lists",
    body: "Therapeutic categories, document types, and source channels.",
  },
];

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Settings, lookup lists, category mapping, and the audit trail."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-muted-foreground" />
                  {s.title}
                </CardTitle>
                <CardDescription>{s.body}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Available once the API is connected.
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
