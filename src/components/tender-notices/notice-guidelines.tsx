import { GuidelineNotice, banglaNumber } from "@/components/guideline-notice";
import { isGuessedText } from "./notice-taxonomy";
import type { TenderNoticeDetail } from "@/types/api";

/** The button a tender is confirmed with — named in the text so it can be found. */
const CONFIRM_BUTTON = "“Confirm This Tender”";

/**
 * What the user should do next on a notice, in Bangla.
 *
 * Two independent notices: whether to distrust the text (OCR), and how far
 * the user has got with choosing tenders to bid on. The second is derived from
 * how many tenders are confirmed, so it moves on by itself as they work.
 */
export function NoticeGuidelines({ notice }: { notice: TenderNoticeDetail }) {
  return (
    <>
      {isGuessedText(notice.extraction_method) && <OcrGuideline />}
      <ParticipationGuideline notice={notice} />
    </>
  );
}

export function OcrGuideline() {
  return (
    <GuidelineNotice tone="warning" title="সাবধান: এই নোটিশটি OCR দিয়ে পড়া হয়েছে">
      মেশিন স্ক্যান করা PDF থেকে লেখা অনুমান করে পড়েছে, তাই যেকোনো অক্ষর বা সংখ্যা
      ভুল হতে পারে। Confirm করার আগে টেন্ডার নম্বর, তারিখ ও খরচ মূল্য PDF-এর সাথে
      মিলিয়ে নিন — টেন্ডার নম্বর ভুল হলে বিডটি হাতছাড়া হতে পারে।
    </GuidelineNotice>
  );
}

function ParticipationGuideline({ notice }: { notice: TenderNoticeDetail }) {
  const total = notice.tenders.length;
  if (total === 0) return null;

  const confirmed = notice.tenders.filter(
    (tender) => tender.notice_confirmed_at !== null,
  ).length;

  if (confirmed === 0) {
    return (
      <GuidelineNotice tone="info" title="এখনো কোনো টেন্ডার Confirm করা হয়নি">
        {total === 1
          ? "টেন্ডারটি খুলে ভালোভাবে যাচাই করুন। "
          : `এই নোটিশে ${banglaNumber(total)}টি টেন্ডার আছে। টেন্ডারগুলো খুলে ভালোভাবে যাচাই করুন, এবং `}
        {total === 1 ? "এতে অংশ নিতে চাইলে " : "যে টেন্ডারে আপনি অংশ নেবেন, "}
        সেটি খুলে {CONFIRM_BUTTON} বাটন চেপে Confirm করুন।
      </GuidelineNotice>
    );
  }

  if (confirmed < total) {
    const remaining = total - confirmed;
    return (
      <GuidelineNotice
        tone="info"
        title={`আপনি মাত্র ${banglaNumber(confirmed)}টি টেন্ডারে অংশ নিয়েছেন`}
      >
        এই নোটিশে আরও {banglaNumber(remaining)}টি টেন্ডার বাকি আছে। আরও টেন্ডারে
        অংশ নিতে চাইলে টেন্ডারটি খুলে যাচাই করুন, তারপর {CONFIRM_BUTTON} বাটন
        চাপুন।
      </GuidelineNotice>
    );
  }

  return (
    <GuidelineNotice tone="success" title="সব টেন্ডার Confirm করা হয়েছে">
      এই নোটিশের {banglaNumber(total)}টি টেন্ডারই এখন Tenders পেজে আছে। সেখান থেকে
      সাপ্লায়ারদের সাথে কাজ চালিয়ে যান।
    </GuidelineNotice>
  );
}
