"use client";

import { useRef, useState } from "react";
import { FileText, Gauge, Loader2, Table2 } from "lucide-react";
import { useTenderNotice } from "@/lib/queries";
import { Callout } from "./notice-callout";
import { CrossCheckCallout } from "./notice-cross-check";
import { ExtractionSummary } from "./notice-extraction-summary";
import { NoticeGuidelines } from "./notice-guidelines";
import { Header } from "./notice-header";
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
  const panelRef = useRef<HTMLElement>(null);

  /** The Tender PDF card's target. It switches the panel below rather than
   *  opening a new tab — the reader wants the scan *beside* the tender table,
   *  which is why that panel embeds the document in the first place — and then
   *  scrolls to it, because on a laptop the panel starts below the fold and a
   *  card that appears to do nothing is worse than no card. */
  function showDocument() {
    setPanel("document");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
      <NoticeGuidelines notice={notice} />
      {/* Sits directly under the OCR warning, because it is the partial
          answer to it: the site publishes the same tender numbers as text,
          so at least those can be verified rather than trusted. */}
      <CrossCheckCallout check={notice.cross_check} />

      <SummaryBand
        notice={notice}
        readiness={readiness}
        onOpenDocument={showDocument}
      />

      {/* One full-width panel with tabs, rather than a table squeezed beside a
          sidebar. The document and the extraction figures are reference
          material — worth a click, not worth a permanent third of the width. */}
      <section
        ref={panelRef}
        className="scroll-mt-4 overflow-hidden rounded-xl border border-border/60 bg-card"
      >
        <div className="border-b border-border/60 px-3 py-3 sm:px-4">
          {/* Full width on a phone, the three segments sharing it equally. */}
          <nav
            aria-label="Notice detail"
            className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary/70 p-1 ring-1 ring-inset ring-border/50 sm:inline-flex sm:w-auto"
          >
            <PanelTab
              active={panel === "tenders"}
              onClick={() => setPanel("tenders")}
              icon={Table2}
              count={notice.tender_count}
            >
              Tenders<span className="hidden sm:inline"> in this notice</span>
            </PanelTab>
            <PanelTab
              active={panel === "document"}
              onClick={() => setPanel("document")}
              icon={FileText}
            >
              <span className="hidden sm:inline">Source </span>Document
            </PanelTab>
            <PanelTab
              active={panel === "summary"}
              onClick={() => setPanel("summary")}
              icon={Gauge}
            >
              <span className="hidden sm:inline">Extraction </span>Summary
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
