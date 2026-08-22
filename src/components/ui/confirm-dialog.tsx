"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The shared "are you sure?" gate for anything destructive — a click alone
 * must not delete or unlink a row, since that costs the user a redo they may
 * not even remember the details of. Originally the tender shortlist's own
 * remove-confirmation; pulled out so every destructive action (tender delete,
 * bulk delete, …) gets the same stop instead of the browser's native
 * `confirm()` popup.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      // Callers that open this from inside another dismiss-on-outside-click
      // panel (e.g. the shortlist popover) need this stopped here, or that
      // panel's own document-level listener reads every click in this dialog
      // as an outside click and closes itself underneath it.
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-left shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              destructive
                ? "bg-destructive/10 text-destructive ring-destructive/20"
                : "bg-primary/10 text-primary ring-primary/20",
            )}
          >
            <TriangleAlert className="size-4.5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            className="h-8 text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            className="h-8 gap-1.5 text-xs"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
