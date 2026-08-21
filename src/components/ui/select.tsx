import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A native `<select>` wearing the design system's input styling.
 *
 * Native rather than a custom listbox on purpose: the filter bar is the first
 * thing a user touches on a phone at a trade fair (NFR-03), and the OS picker
 * beats anything we would build for that. The chevron is ours because
 * `appearance-none` removes the platform one.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-input bg-card px-4 pr-10 text-sm font-medium text-foreground shadow-sm transition-all",
        "hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      strokeWidth={2}
    />
  </div>
));
Select.displayName = "Select";

export { Select };
