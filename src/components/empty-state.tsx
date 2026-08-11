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
    <div className="relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30 p-12 text-center">
      <div
        className="bg-dot-grid pointer-events-none absolute inset-0 [-webkit-mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)]"
        aria-hidden
      />
      <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-inset ring-border">
        <Icon className="size-6" />
      </div>
      <h2 className="relative text-lg font-medium tracking-tight">{title}</h2>
      {description && (
        <p className="relative mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="relative mt-6">{children}</div>}
    </div>
  );
}
