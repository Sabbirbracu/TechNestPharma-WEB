"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteCompany, useUpdateCompany } from "@/lib/queries";
import {
  IconButton,
  OUTLINE_BUTTON,
} from "@/components/companies/detail/section-card";
import { downloadCompanyProfile } from "@/components/companies/detail/company-profile-export";
import type { CompanyDetail } from "@/types/api";

/**
 * The row above the banner: back to the directory on the left, and the three
 * things you do *to* the profile rather than inside it on the right.
 *
 * Share copies the URL rather than opening a share sheet — this is an internal
 * tool behind a login, so "send this to a colleague" means pasting a link into
 * whatever the desk already uses.
 */
export function CompanyPageActions({
  company,
  onEdit,
  onAddContact,
}: {
  company: CompanyDetail;
  onEdit: () => void;
  onAddContact: () => void;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateCompany = useUpdateCompany(company.id);
  const deleteCompany = useDeleteCompany();

  const primaryEmail = company.contacts
    .flatMap((contact) => contact.channels)
    .find((channel) => channel.channel === "email")?.value;

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadCompanyProfile(company);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build the profile.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/companies"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.2} />
        Back to Companies
      </Link>

      <div className="flex items-center gap-2.5">
        <button type="button" onClick={share} className={OUTLINE_BUTTON}>
          <Share2 className="text-success" strokeWidth={2.2} />
          Share
        </button>

        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className={OUTLINE_BUTTON}
        >
          {downloading ? (
            <Loader2 className="animate-spin text-success" strokeWidth={2.2} />
          ) : (
            <Download className="text-success" strokeWidth={2.2} />
          )}
          Download Profile
        </button>

        <DropdownMenu
          trigger={(props) => (
            <IconButton
              aria-label="More company actions"
              className="size-10 rounded-xl"
              {...props}
            >
              <MoreHorizontal strokeWidth={2.2} />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                <Pencil />
                Edit company
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  onAddContact();
                }}
              >
                <UserPlus />
                Add contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  updateCompany.mutate(
                    { is_watchlisted: !company.is_watchlisted },
                    {
                      onSuccess: () =>
                        toast.success(
                          company.is_watchlisted
                            ? "Removed from the watchlist"
                            : "Added to the watchlist",
                        ),
                      onError: () => toast.error("Could not update the watchlist."),
                    },
                  );
                }}
              >
                <Star />
                {company.is_watchlisted ? "Remove from watchlist" : "Add to watchlist"}
              </DropdownMenuItem>
              {primaryEmail ? (
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    window.location.href = `mailto:${primaryEmail}`;
                  }}
                >
                  <Mail />
                  Email this supplier
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => {
                  close();
                  void share();
                }}
              >
                <Link2 />
                Copy profile link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => {
                  close();
                  setConfirmingDelete(true);
                }}
              >
                <Trash2 />
                Delete company
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </div>

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete this company?"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{company.name_en}&quot;
              </span>
              ? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleteCompany.isPending}
          onConfirm={() =>
            deleteCompany.mutate(company.id, {
              onSuccess: () => router.push("/companies"),
              onError: () => toast.error("Could not delete this company."),
              onSettled: () => setConfirmingDelete(false),
            })
          }
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </div>
  );
}
