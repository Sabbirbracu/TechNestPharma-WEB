"use client";

import * as React from "react";
import { AnchoredPopover, useDismiss } from "@/components/ui/anchored-popover";
import { cn } from "@/lib/utils";

/**
 * A minimal popover menu. Hand-rolled because this project has no Radix
 * dependency and one row-actions menu does not justify adding one.
 *
 * The panel is portalled (see AnchoredPopover) so the products table's
 * `overflow-x-auto` scroll container cannot clip it. Beyond that it covers what
 * a menu has to get right: closes on outside click and Escape, and returns
 * focus to the trigger on close.
 */
export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: (props: {
    onClick: (event: React.MouseEvent) => void;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  // Both elements are state rather than refs: the popover needs the trigger as
  // a positioning anchor during render, and a ref's `.current` is not readable
  // then. A callback ref re-renders once on mount, which is what makes the
  // anchor available on the render that first opens the menu.
  const [triggerEl, setTriggerEl] = React.useState<HTMLButtonElement | null>(null);
  const [panelEl, setPanelEl] = React.useState<HTMLDivElement | null>(null);
  // Focus returns to the trigger when the menu closes, but only when the menu
  // was the thing that had it — restoring on the first render would steal focus
  // from wherever the user actually is.
  const wasOpen = React.useRef(false);

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open && wasOpen.current) triggerEl?.focus();
    wasOpen.current = open;
  }, [open, triggerEl]);

  useDismiss(open, close, [triggerEl, panelEl]);

  return (
    <>
      {trigger({
        ref: setTriggerEl,
        onClick: (event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        },
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}

      <AnchoredPopover anchor={triggerEl} open={open} align={align}>
        <div
          ref={setPanelEl}
          role="menu"
          className={cn(
            "min-w-44 overflow-hidden rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg",
            className,
          )}
        >
          {children(close)}
        </div>
      </AnchoredPopover>
    </>
  );
}

export function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: React.ComponentProps<"button"> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent/70",
        "focus-visible:bg-accent/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1.5 h-px bg-border/60" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}
