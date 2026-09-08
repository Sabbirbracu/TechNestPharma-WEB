"use client";

import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Send,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUpdateCompany } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  OUTLINE_BUTTON,
  SectionCard,
} from "@/components/companies/detail/section-card";
import type { CompanyDetail } from "@/types/api";

/** The two cards that sit side by side under the banner: what this company is,
 *  and what you can do about it. Paired in one component because they share a
 *  row and must match heights. */
export function CompanyOverview({
  company,
  onEdit,
  onCreateOffer,
}: {
  company: CompanyDetail;
  onEdit: () => void;
  onCreateOffer: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
      <SectionCard
        icon={Package}
        title="Overview"
        className="h-full"
        actions={
          <button type="button" onClick={onEdit} className={cn(OUTLINE_BUTTON, "h-9 px-3.5 text-[13px]")}>
            <Pencil strokeWidth={2.2} />
            Edit
          </button>
        }
      >
        <dl className="space-y-5">
          <OverviewRow
            label="Address"
            icon={MapPin}
            value={company.address}
            fallback="No address on file yet."
          />
          <OverviewRow
            label="Description"
            icon={FileText}
            value={company.description ?? null}
            fallback="No description yet — add one from Edit."
          />
        </dl>
      </SectionCard>

      <QuickActions company={company} onCreateOffer={onCreateOffer} />
    </div>
  );
}

function OverviewRow({
  label,
  icon: Icon,
  value,
  fallback,
}: {
  label: string;
  icon: ElementType;
  value: string | null;
  fallback: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
      <dt className="w-28 shrink-0 pt-0.5 text-sm font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon
          aria-hidden
          className="mt-0.5 size-[18px] shrink-0 text-success"
          strokeWidth={2}
        />
        <span
          className={cn(
            "text-sm leading-relaxed",
            value
              ? "font-medium text-foreground"
              : "italic text-muted-foreground/70",
          )}
        >
          {value ?? fallback}
        </span>
      </dd>
    </div>
  );
}

function QuickActions({
  company,
  onCreateOffer,
}: {
  company: CompanyDetail;
  onCreateOffer: () => void;
}) {
  const router = useRouter();
  const updateCompany = useUpdateCompany(company.id);

  const primaryEmail = company.contacts
    .flatMap((contact) => contact.channels)
    .find((channel) => channel.channel === "email")?.value;

  return (
    <SectionCard icon={Zap} title="Quick Actions" className="h-full">
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickAction
          icon={Send}
          label="Start Sourcing"
          tone="solid"
          onClick={() => router.push(`/sourcing?company=${company.id}`)}
        />
        <QuickAction icon={FileText} label="Create Offer" onClick={onCreateOffer} />
        <QuickAction
          // The watchlist is the shortlist this app already has: one flag per
          // company, shown as a star everywhere else in the directory.
          icon={company.is_watchlisted ? BookmarkCheck : Bookmark}
          label={company.is_watchlisted ? "On Shortlist" : "Add to Shortlist"}
          active={company.is_watchlisted}
          busy={updateCompany.isPending}
          onClick={() =>
            updateCompany.mutate(
              { is_watchlisted: !company.is_watchlisted },
              {
                onSuccess: () =>
                  toast.success(
                    company.is_watchlisted
                      ? "Removed from the shortlist"
                      : "Added to the shortlist",
                  ),
                onError: () => toast.error("Could not update the shortlist."),
              },
            )
          }
        />
        <QuickAction
          icon={Mail}
          label="Send Message"
          onClick={() => {
            if (!primaryEmail) {
              toast.error("No email address on file for this company.");
              return;
            }
            window.location.href = `mailto:${primaryEmail}`;
          }}
        />
      </div>
    </SectionCard>
  );
}




function QuickAction({
  icon: Icon,
  label,
  onClick,
  tone = "outline",
  active = false,
  busy = false,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
  tone?: "solid" | "outline";
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex h-14 items-center justify-center gap-2.5 rounded-xl px-2 text-sm font-semibold transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 disabled:pointer-events-none disabled:opacity-60",
        tone === "solid"
          ? "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md"
          : active
            ? "border border-success/40 bg-success/10 text-success shadow-sm"
            : "border border-border bg-card text-foreground shadow-sm hover:border-success/40 hover:bg-success/5",
      )}
    >
      {busy ? (
        <Loader2 className="size-[18px] animate-spin" strokeWidth={2} />
      ) : (
        <Icon className="size-[18px] shrink-0" strokeWidth={2} />
      )}
      {label}
    </button>
  );
}
