import { type ReactNode } from "react";

/** 
 * Premium page header with refined visual hierarchy and enhanced accent bar.
 * Mobile-optimized with responsive spacing and typography.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-background via-background to-accent/5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-6">
      <div className="flex gap-3 sm:gap-4">
        <div className="relative mt-1 flex flex-col gap-1">
          {/* Premium accent bar with gradient */}
          <span className="h-6 w-1 rounded-full bg-gradient-to-b from-primary via-primary to-primary/70 shadow-sm sm:h-9" />
          {/* Subtle glow effect */}
          <span className="absolute left-0 top-0 h-6 w-1 rounded-full bg-primary/40 blur-sm sm:h-9" />
        </div>
        <div className="space-y-1 min-w-0 flex-1 sm:space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-xs font-medium text-muted-foreground/90 leading-relaxed max-w-2xl sm:text-sm">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 sm:mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
