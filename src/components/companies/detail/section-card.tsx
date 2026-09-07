"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The chrome every block on a company's page wears: a soft green icon tile, a
 * title with an optional caption, and a right-hand action strip.
 *
 * Written once here rather than per section so Overview, Quick Actions,
 * Contacts, the catalogue, Documents and Notes all sit on the same header
 * grid — five near-identical headers drifting apart is exactly what this page
 * looked like before.
 */
export function SectionCard({
  icon: Icon,
  title,
  caption,
  actions,
  children,
  className,
  bodyClassName,
}: {
  icon: ElementType;
  title: ReactNode;
  caption?: ReactNode;
  /** Buttons and inputs on the header's right edge. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success ring-1 ring-inset ring-success/15">
            <Icon className="size-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {caption ? (
              <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
                {caption}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {actions}
          </div>
        ) : null}
      </header>

      {children === undefined ? null : (
        <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", bodyClassName)}>
          {children}
        </div>
      )}
    </section>
  );
}

/** The square icon-only button the mock uses for every row's overflow menu. */
export function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors",
        "hover:border-success/40 hover:bg-success/5 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** The green primary button of this page. The app's `default` variant is the
 *  navy brand blue; the company profile's call-to-actions are green, so they
 *  are spelled out once here instead of in six places. */
export const GREEN_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-success px-4 text-sm font-semibold text-success-foreground shadow-sm transition-all hover:bg-success/90 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";

/** Its outline twin — white, hairline border, green on hover. */
export const OUTLINE_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-success/40 hover:bg-success/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";
