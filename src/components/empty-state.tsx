import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Placeholder shown by a module screen that has no data (or, in this
 * boilerplate, no backend wired up yet). Distinct from a broken/"Coming Soon"
 * state — the screen works, it is simply empty. (SRS §2.2.)
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground ring-1 ring-inset ring-border">
        <Icon className="size-6" />
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
