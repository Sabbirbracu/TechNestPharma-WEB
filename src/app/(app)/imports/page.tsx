import type { Metadata } from "next";
import { Upload, PencilLine, FileSpreadsheet, ScanText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Import" };

/**
 * Three front doors into one shared staging → preview → commit core
 * (05-architecture Part C). This screen is the highest-priority module for
 * adoption (SRS §6.12 design note): the catalogue's value is proportional to
 * how much of the paper stack gets entered.
 */
const CHANNELS = [
  {
    icon: PencilLine,
    title: "Manual entry",
    tag: "Channel A",
    body: "Add one record by hand, or use leaflet-beside-the-form rapid entry — the scan pinned left, the form right, the whole product list in one flow. Highlighted rows become watchlisted; handwritten quantities become interest notes.",
    cta: "Start entry",
  },
  {
    icon: FileSpreadsheet,
    title: "Digital file",
    tag: "Channel B",
    body: "Upload a CSV or Excel file — the existing 2,517-row consolidated sheet or a supplier's own layout. Map columns once, then validate-and-preview before commit. Every batch is undoable.",
    cta: "Upload a file",
  },
  {
    icon: ScanText,
    title: "Leaflet photo",
    tag: "Channel C",
    body: "Upload leaflet photos; a vision model extracts the company, contacts, and product table into the same preview grid. The image is kept as a document — never auto-committed, always checked by a human.",
    cta: "Upload photos",
  },
];

export default function ImportsPage() {
  return (
    <>
      <PageHeader
        title="Import"
        description="Three ways in, one shared validate-preview-commit core."
      >
        <Button variant="outline">
          <Upload />
          Import history
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.tag}
                  </span>
                </div>
                <CardTitle className="text-base">{c.title}</CardTitle>
                <CardDescription>{c.body}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="secondary" className="w-full">
                  {c.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
