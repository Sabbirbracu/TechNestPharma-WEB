import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "info" | "success";

const TONE: Record<Tone, { box: string; icon: typeof Info }> = {
  warning: {
    box: "border-warning/40 border-l-warning bg-warning/15 text-warning-foreground",
    icon: AlertTriangle,
  },
  info: {
    box: "border-primary/25 border-l-primary bg-primary/[0.07] text-foreground",
    icon: Info,
  },
  success: {
    box: "border-success/30 border-l-success bg-success/10 text-foreground",
    icon: CheckCircle2,
  },
};

/**
 * A step-by-step instruction for the user, written in Bangla.
 *
 * Deliberately louder than `Callout`: larger type, a thick left bar and a
 * heading. These tell the user what to DO next on this screen, and the small
 * grey English warnings they replace were being scrolled past.
 */
export function GuidelineNotice({
  tone,
  title,
  children,
  className,
}: {
  tone: Tone;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = TONE[tone];
  return (
    <div
      lang="bn"
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-l-4 px-4 py-3 shadow-sm",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[15px] font-bold leading-snug">{title}</p>
        <div className="text-sm font-medium leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** 3 → "৩". Counts inside Bangla sentences read wrong in Latin digits. */
export function banglaNumber(value: number): string {
  return value.toLocaleString("bn-BD");
}
