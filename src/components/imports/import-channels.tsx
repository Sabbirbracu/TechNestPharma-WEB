"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileSpreadsheet,
  History,
  PencilLine,
  ScanText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LeafletUploadDialog } from "@/components/imports/leaflet-upload-dialog";
import { SheetUploadDialog } from "@/components/imports/sheet-upload-dialog";
import { useAuth } from "@/lib/auth";
import { useImportBatches, useOcrStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ImportBatch } from "@/types/api";

type Channel = "sheet" | "leaflet" | null;

/**
 * Three front doors into one shared staging → preview → commit core
 * (05-architecture Part C). This screen is the highest-priority module for
 * adoption (SRS §6.12 design note): the catalogue's value is proportional to
 * how much of the paper stack gets entered.
 */
export function ImportChannels() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(null);
  const { data: ocr } = useOcrStatus();
  const recent = useImportBatches({ size: 20 });
  const { user } = useAuth();
  const canApprove = user?.role === "owner";

  const batches = recent.data?.items ?? [];
  // Two distinct piles, because they need different people. Anything awaiting
  // approval is somebody else's turn; anything still in preparation is yours.
  const awaitingApproval = batches.filter(
    (batch) => batch.status === "pending_approval",
  );
  const inPreparation = batches.filter(
    (batch) => batch.status === "previewed" || batch.status === "parsed",
  );

  return (
    <>
      <PageHeader
        title="Import"
        description="Three ways in, one shared validate-preview-commit core."
      >
        <Link
          href="/imports/history"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <History />
          Import history
        </Link>
      </PageHeader>

      {awaitingApproval.length > 0 && (
        <BatchQueue
          title={
            canApprove
              ? "Waiting for your approval"
              : "Submitted, waiting for an owner"
          }
          icon={ShieldCheck}
          batches={awaitingApproval}
          highlight
        />
      )}

      {inPreparation.length > 0 && (
        <BatchQueue
          title="Still being prepared"
          icon={FileSpreadsheet}
          batches={inPreparation}
        />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ChannelCard
          icon={PencilLine}
          tag="Channel A"
          title="Manual entry"
          body="Add one record by hand, or work with the leaflet beside the form. Writes straight through — no staging, no preview, validation as you type."
          cta="Start entry"
          onClick={() => router.push("/products/new")}
        />
        <ChannelCard
          icon={FileSpreadsheet}
          tag="Channel B"
          title="Digital file"
          body="Upload a CSV or Excel file — the consolidated sheet or a supplier's own layout. Map the columns once, check the preview, then commit. Every batch is undoable."
          cta="Upload a file"
          onClick={() => setChannel("sheet")}
        />
        <ChannelCard
          icon={ScanText}
          tag="Channel C"
          title="Leaflet photo"
          body={
            ocr && !ocr.available
              ? "Unavailable: the OCR engine is not installed on this server. Use manual entry for leaflets in the meantime."
              : "Photograph a leaflet and OCR reads the product table into the same preview grid. The photo is kept as a document, and nothing is ever committed unchecked."
          }
          cta="Upload a photo"
          onClick={() => setChannel("leaflet")}
          disabled={ocr ? !ocr.available : false}
        />
      </div>

      <SheetUploadDialog
        open={channel === "sheet"}
        onClose={() => setChannel(null)}
      />
      <LeafletUploadDialog
        open={channel === "leaflet"}
        onClose={() => setChannel(null)}
      />
    </>
  );
}

function BatchQueue({
  title,
  icon: Icon,
  batches,
  highlight = false,
}: {
  title: string;
  icon: typeof Upload;
  batches: ImportBatch[];
  highlight?: boolean;
}) {
  return (
    <section
      className={`mt-4 rounded-xl border px-4 py-3 ${
        highlight
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-accent/30"
      }`}
    >
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {batches.map((batch) => (
          <li key={batch.id}>
            <Link
              href={`/imports/${batch.id}`}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {batch.filename}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(batch.total_rows ?? 0).toLocaleString()} rows
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChannelCard({
  icon: Icon,
  tag,
  title,
  body,
  cta,
  onClick,
  disabled = false,
}: {
  icon: typeof Upload;
  tag: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {tag}
          </span>
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button
          variant="secondary"
          className="w-full"
          onClick={onClick}
          disabled={disabled}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
