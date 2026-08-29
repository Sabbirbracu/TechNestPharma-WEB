import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenderReview } from "@/components/tender-notices/tender-review";
import { referenceFromSegments } from "@/components/tender-notices/notice-taxonomy";

export const metadata: Metadata = { title: "Tender Review" };

/**
 * One tender out of a notice, on a page of its own.
 *
 * A CATCH-ALL segment because the reference number contains slashes —
 * `/tender-notices/135/IMP/RM/SEM/10/2026-2027` — and the client wanted them
 * literal in the URL rather than percent-encoded. Next hands them back as an
 * array of path parts, which `referenceFromSegments` rejoins.
 *
 * `params` is a Promise in this version of Next; see AGENTS.md.
 */
export default async function TenderReviewPage({
  params,
}: {
  params: Promise<{ id: string; reference: string[] }>;
}) {
  const { id, reference } = await params;
  const noticeId = Number(id);
  if (!Number.isFinite(noticeId) || !reference?.length) notFound();

  return (
    // Wider than the notice screen: the item table carries raw name,
    // specification, matched product, confidence and a supplier list, and it
    // is the reason this page exists at all.
    <div className="w-full max-w-none px-4 py-4 sm:px-6 sm:py-6">
      <TenderReview
        noticeId={noticeId}
        reference={referenceFromSegments(reference)}
      />
    </div>
  );
}
