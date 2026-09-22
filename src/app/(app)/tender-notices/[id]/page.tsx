import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoticeDetail } from "@/components/tender-notices/notice-detail";

export const metadata: Metadata = { title: "Tender Notice" };

/**
 * One notice: the tenders inside it, and each tender's requirement lines with
 * the catalogue product they were matched to.
 *
 * `params` is a Promise in this version of Next — see AGENTS.md.
 */
export default async function TenderNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noticeId = Number(id);
  if (!Number.isFinite(noticeId)) notFound();

  return (
    /* No top padding of its own: the shell already pads every page
       (app-shell.tsx), and stacking a second band above the back link pushed
       the notice's own title a long way down the screen. */
    /* No side padding on a phone either — the shell's own gutter is enough,
       and doubling it cost the tender cards a sixth of their width. */
    <div className="mx-auto w-full max-w-[1400px] pb-4 sm:px-6 sm:pb-6">
      <NoticeDetail noticeId={noticeId} />
    </div>
  );
}
