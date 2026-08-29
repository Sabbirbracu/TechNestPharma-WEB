"use client";

import { useState } from "react";
import { FileText, Gauge, Loader2, Table2 } from "lucide-react";
import { useTenderNotice } from "@/lib/queries";
import { Callout } from "./notice-callout";
import { ExtractionSummary } from "./notice-extraction-summary";
import { Header } from "./notice-header";
import { isGuessedText } from "./notice-taxonomy";
import { PanelTab } from "./notice-panel-tab";
import { readinessOf } from "./notice-readiness";
import { SourceDocument } from "./notice-source-document";
import { SummaryBand } from "./notice-summary-band";
import { TenderTable } from "./notice-tender-table";

/**
 * One notice, its tenders, and each tender's requirement lines.
 *
 * The hierarchy the screen exists to make navigable:
 *
 *     Notice  →  Tender (reference no, dates, schedule cost)  →  Items
 *                                                                  ↓
 *                                                        matched catalogue product
 *
 * The page is built around one question — "can this notice go live, and if
 * not, what is stopping it?" That is why the band under the header reports
 * the notice's real figures and names the blocker, rather than showing the
 * pipeline diagram that used to sit there: the diagram restated the status
 * pill in five boxes and never said what to do next.
 */
type Panel = "tenders" | "document" | "summary";

export function NoticeDetail({ noticeId }: { noticeId: number }) {
  const { data: notice, isPending } = useTenderNotice(noticeId);
  const [panel, setPanel] = useState<Panel>("tenders");

  if (isPending) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading notice…
      </div>
    );
  }
  if (!notice) {
    return (
      <p className="p-8 text-sm font-medium text-muted-foreground">
        Could not load this notice.
      </p>
    );
  }

  const readiness = readinessOf(notice);

  return (
    <div className="space-y-4">
      <Header notice={notice} readiness={readiness} />

      {notice.extraction_error && (
        <Callout tone="error">{notice.extraction_error}</Callout>
      )}
      {isGuessedText(notice.extraction_method) && (
        <Callout tone="warning">
          This notice was read by OCR, so every character is a guess rather than
          a read. Check the tender numbers, dates and costs against the document
          before confirming — a misread reference number is a lost bid.
        </Callout>
      )}

      <SummaryBand notice={notice} readiness={readiness} />

      {/* One full-width panel with tabs, rather than a table squeezed beside a
          sidebar. The document and the extraction figures are reference
          material — worth a click, not worth a permanent third of the width. */}
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <nav
            aria-label="Notice detail"
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary/70 p-1 ring-1 ring-inset ring-border/50"
          >
            <PanelTab
              active={panel === "tenders"}
              onClick={() => setPanel("tenders")}
              icon={Table2}
              count={notice.tender_count}
            >
              Tenders in this notice
            </PanelTab>
            <PanelTab
              active={panel === "document"}
              onClick={() => setPanel("document")}
              icon={FileText}
            >
              Source Document
            </PanelTab>
            <PanelTab
              active={panel === "summary"}
              onClick={() => setPanel("summary")}
              icon={Gauge}
            >
              Extraction Summary
            </PanelTab>
          </nav>
        </div>

        {panel === "tenders" ? (
          <TenderTable notice={notice} />
        ) : panel === "document" ? (
          <SourceDocument notice={notice} />
        ) : (
          <ExtractionSummary notice={notice} />
        )}
      </section>
    </div>
  );
}
