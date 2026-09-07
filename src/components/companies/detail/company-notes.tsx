"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUpdateCompany } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  GREEN_BUTTON,
  IconButton,
  OUTLINE_BUTTON,
  SectionCard,
} from "@/components/companies/detail/section-card";
import type { CompanyDetail } from "@/types/api";

/**
 * The desk's running note on a supplier — what the sheet said, what was agreed
 * on the phone, why they are on the watchlist.
 *
 * One note, because `company.notes` is one text column: there is no author or
 * timestamp to show per entry, so the card does not pretend there is a thread.
 * When the backend grows a real notes table this card is where the list goes.
 */
export function CompanyNotes({ company }: { company: CompanyDetail }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(company.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateCompany = useUpdateCompany(company.id);

  // Seeded on the way in rather than kept in sync: a refetch landing mid-edit
  // must not overwrite what is being typed, and there is nothing to sync while
  // the editor is closed.
  function beginEdit() {
    setDraft(company.notes ?? "");
    setEditing(true);
  }

  function save(value: string, message: string) {
    updateCompany.mutate(
      { notes: value || null },
      {
        onSuccess: () => {
          setEditing(false);
          setConfirmingDelete(false);
          toast.success(message);
        },
        onError: () => toast.error("Could not save this note."),
      },
    );
  }

  const hasNote = Boolean(company.notes?.trim());

  return (
    <SectionCard
      icon={StickyNote}
      title="Notes"
      actions={
        editing ? null : (
          <button
            type="button"
            onClick={beginEdit}
            className={GREEN_BUTTON}
          >
            {hasNote ? <Pencil strokeWidth={2.2} /> : <Plus strokeWidth={2.4} />}
            {hasNote ? "Edit Note" : "Add Note"}
          </button>
        )
      }
    >
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            autoFocus
            aria-label="Company note"
            placeholder="What should the next person to open this profile know?"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm font-medium leading-relaxed shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={OUTLINE_BUTTON}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(draft.trim(), "Note saved")}
              disabled={updateCompany.isPending}
              className={GREEN_BUTTON}
            >
              {updateCompany.isPending ? (
                <Loader2 className="animate-spin" strokeWidth={2.2} />
              ) : null}
              Save Note
            </button>
          </div>
        </div>
      ) : hasNote ? (
        <article className="flex gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <StickyNote className="size-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-foreground">Company note</p>
              <DropdownMenu
                trigger={(props) => (
                  <IconButton
                    aria-label="Note actions"
                    className={cn("size-8 border-transparent shadow-none")}
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
                        beginEdit();
                      }}
                    >
                      <Pencil />
                      Edit note
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
                      Delete note
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenu>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-muted-foreground">
              {company.notes}
            </p>
          </div>
        </article>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">No notes yet</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Anything worth remembering about this supplier goes here.
          </p>
        </div>
      )}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete this note?"
          description="The note on this company will be cleared. This cannot be undone from here."
          confirmLabel="Delete"
          busy={updateCompany.isPending}
          onConfirm={() => save("", "Note deleted")}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </SectionCard>
  );
}
