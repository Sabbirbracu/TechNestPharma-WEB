"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X, Search, Bell } from "lucide-react";
import { useAuth, initialsOf } from "@/lib/auth";
import { Sidebar } from "./sidebar";

/**
 * Application chrome: a fixed sidebar on desktop, a slide-over drawer on mobile
 * (NFR-03 — every screen must be usable from a phone on a trade-fair floor).
 * Enhanced with premium glass-morphism and refined shadows.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar with subtle shadow */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar shadow-md lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer with premium backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50 backdrop-blur-md transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-4 top-5 z-10 rounded-lg p-1.5 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground hover:scale-105"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Premium topbar with glass effect */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-4 shadow-sm backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          {/* Enhanced search bar */}
          <Link
            href="/search"
            className="group flex h-10 max-w-md flex-1 items-center gap-3 rounded-full border border-input/80 bg-secondary/50 px-4 text-sm text-muted-foreground shadow-inner ring-1 ring-transparent transition-all hover:border-ring/50 hover:bg-accent/60 hover:text-foreground hover:ring-ring/10"
          >
            <Search className="size-4 shrink-0 transition-transform group-hover:scale-110" strokeWidth={2} />
            <span className="truncate font-medium">Search products by name or CAS…</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground shadow-xs ring-1 ring-border/20 sm:inline-flex">
              ⌘K
            </kbd>
          </Link>

          {/* Premium action buttons */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105"
            >
              <Bell className="size-5" strokeWidth={2} />
              {/* Enhanced notification badge */}
              <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-primary ring-2 ring-background"></span>
              </span>
            </button>
            <div
              title={user?.full_name}
              className="ml-1 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-primary-hover text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-background/50 transition-transform hover:scale-105 lg:hidden"
            >
              {initialsOf(user)}
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
