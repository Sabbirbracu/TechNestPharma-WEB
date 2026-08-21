"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A panel pinned to a trigger element, rendered in a portal.
 *
 * Absolute positioning inside the row is not enough here. The products table
 * sets `overflow-x-auto` on its scroll container and `overflow-hidden` on the
 * cells that truncate, and either one clips a menu that opens downward — the
 * menu is in the DOM and painted, just cropped to nothing. No z-index fixes
 * that: clipping happens before stacking is considered.
 *
 * So the panel leaves the table's DOM entirely, goes on `document.body`, and
 * positions itself `fixed` from the trigger's rect. It re-measures on scroll
 * and resize so it tracks the trigger rather than detaching from it, and flips
 * above the trigger when the viewport has no room below — which is what the
 * last rows of a full page need.
 */
export function AnchoredPopover({
  anchor,
  open,
  align = "end",
  gap = 6,
  className,
  children,
  ...props
}: {
  anchor: HTMLElement | null;
  open: boolean;
  /** Which edge of the panel lines up with the trigger's matching edge. */
  align?: "start" | "end";
  gap?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "children">) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Until the panel has been measured there is nowhere correct to put it, so
  // it starts off-screen and invisible rather than flashing at the origin.
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !anchor) return;

    const place = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = anchor.getBoundingClientRect();
      const { offsetHeight: height, offsetWidth: width } = panel;

      const roomBelow = window.innerHeight - rect.bottom;
      const flip = roomBelow < height + gap && rect.top > height + gap;
      const top = flip ? rect.top - height - gap : rect.bottom + gap;

      const preferred = align === "end" ? rect.right - width : rect.left;
      // Never let the panel hang off either edge of the viewport.
      const left = Math.max(
        8,
        Math.min(preferred, window.innerWidth - width - 8),
      );

      setPosition({ top, left });
    };

    place();
    // Capture phase: the table body is its own scroll container, and a scroll
    // there does not bubble to window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, align, gap]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      className={cn("z-[60]", className)}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Close-on-outside-interaction for a portalled panel.
 *
 * `contains` on the trigger's container will not find the panel — it lives on
 * `document.body` — so both elements have to be checked by hand. Escape closes
 * too, and the handlers only exist while the panel is open, so a page of fifty
 * rows is not fifty idle document listeners.
 */
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  elements: (HTMLElement | null)[],
) {
  // Held in a ref so the listener effect does not resubscribe on every render
  // just because the caller built a fresh array. Written in an effect rather
  // than during render, which is the only legal place to mutate a ref.
  const elementsRef = React.useRef(elements);
  React.useEffect(() => {
    elementsRef.current = elements;
  });

  React.useEffect(() => {
    if (!open) return;

    const isInside = (target: Node) =>
      elementsRef.current.some((element) => element?.contains(target));

    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss]);
}
