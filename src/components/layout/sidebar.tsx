"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { NAV_SECTIONS } from "@/config/nav";
import { useAuth, initialsOf } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Sentence-case the role enum for display: "owner" → "Owner". */
const ROLE_LABEL: Record<string, string> = {
  owner: "Full access",
  staff: "Staff",
  viewer: "Read only",
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <nav aria-label="Primary" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand, logo inverted for the dark background. Padding matches the nav
          below rather than being roomier: at the sidebar's 208px the wordmark
          needs 115px, and px-6 leaves 114 — one pixel short of keeping
          "TechNest Pharma" on a single line. */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="border-b border-sidebar-border/50 px-4 py-6 transition-opacity hover:opacity-90"
        aria-label="TechNest Pharma — go to dashboard"
      >
        <BrandLockup inverted />
      </Link>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label} className="space-y-1.5">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40">
              {section.label}
            </p>
            {section.items.map((item, itemIndex) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
                    active
                      ? "bg-white/10 text-white shadow-md backdrop-blur-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-white shadow-lg shadow-white/30" />
                  )}
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0 transition-all duration-200",
                      active
                        ? "text-white scale-110"
                        : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground group-hover:scale-105",
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Premium footer with enhanced user profile - green accent on dark navy */}
      <div className="border-t border-sidebar-border/50 bg-sidebar/95 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/70 px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success via-success to-success/90 text-xs font-bold text-success-foreground shadow-lg shadow-success/20">
            {initialsOf(user)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user?.full_name ?? "—"}
            </p>
            <p className="truncate text-xs font-medium text-sidebar-foreground/60">
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="ml-auto shrink-0 rounded-lg p-2 text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:scale-105 disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
