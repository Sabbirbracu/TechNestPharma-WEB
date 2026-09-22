"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api";
import { useUpdateNoticeTender } from "@/lib/queries";
import type { NoticeTender } from "@/types/api";

/**
 * A tender's name, editable in place.
 *
 * The name starts out automatic — "<first item> +N more", kept in step with the
 * items by the server — because references like `IMP/RM/SEM/18/2026-2027`
 * differ by two digits and nobody can tell rows apart by them. Typing a name
 * makes it the user's own; "Use automatic name" hands it back.
 */
export function TenderName({ tender }: { tender: NoticeTender }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tender.name);
  const update = useUpdateNoticeTender();

  function save(name: string | null) {
    update.mutate(
      { tenderId: tender.id, name },
      {
        onSuccess: () => {
          toast.success(name ? "Tender renamed" : "Using the automatic name");
          setEditing(false);
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Could not rename the tender",
          ),
      },
    );
  }

  function submit() {
    const name = draft.replace(/\s+/g, " ").trim();
    if (!name) {
      toast.error("A tender name cannot be empty.");
      return;
    }
    if (name === tender.name) {
      setEditing(false);
      return;
    }
    save(name);
  }

  if (editing) {
    return (
      <form
        className="flex w-full max-w-2xl items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
          maxLength={300}
          disabled={update.isPending}
          aria-label="Tender name"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-lg font-bold text-foreground shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={update.isPending}
          aria-label="Save name"
          className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" strokeWidth={2.5} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={update.isPending}
          aria-label="Cancel"
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h1 className="min-w-0 break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {tender.name}
      </h1>
      <button
        type="button"
        onClick={() => {
          setDraft(tender.name);
          setEditing(true);
        }}
        aria-label="Rename tender"
        title="Rename tender"
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Pencil className="size-4" />
      </button>
      {tender.name_is_custom && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={update.isPending}
          title="Name it after its items again"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          <RotateCcw className="size-3" />
          Use automatic name
        </button>
      )}
    </div>
  );
}
