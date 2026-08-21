import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A checkbox styled to match the design system, built on a real `<input>` so
 * keyboard and screen-reader behaviour comes for free.
 *
 * `indeterminate` is not an HTML attribute — it only exists as a DOM property —
 * so the header "select all" box needs the ref effect below to show a dash when
 * some but not all rows on the page are selected.
 */
const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type"> & { indeterminate?: boolean }
>(({ className, indeterminate = false, checked, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(forwardedRef, () => innerRef.current!, []);

  React.useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className={cn("relative inline-flex size-[18px] shrink-0", className)}>
      <input
        ref={innerRef}
        type="checkbox"
        checked={checked}
        className="peer size-full cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-input bg-card shadow-xs transition-all hover:border-primary/50 checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-100"
      >
        {indeterminate ? (
          <Minus className="size-3" strokeWidth={3.5} />
        ) : (
          <Check className="size-3" strokeWidth={3.5} />
        )}
      </span>
    </span>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
