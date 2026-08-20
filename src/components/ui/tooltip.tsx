import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A "comment box" style hover tooltip — a small padded card that fades and
 * slides up on hover, rather than a thin single-line pill. CSS transition,
 * not a JS timer, so there's none of the OS-native `title` attribute's ~1s
 * delay.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-64 -translate-x-1/2 translate-y-1 rounded-xl border border-input bg-blue-50 px-3.5 py-3 text-left text-foreground opacity-0 shadow-lg transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100"
      >
        {content}
      </div>
    </div>
  );
}
