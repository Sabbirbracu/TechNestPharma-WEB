"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { UserAvatar } from "@/components/user-avatar";
import { NAV_SECTIONS, type NavItem } from "@/config/nav";
import { useAuth } from "@/lib/auth";
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

  // Owner-only entries are dropped rather than shown disabled. The Inbox reads
  // the client's own Gmail, and a greyed-out link would advertise that his
  // personal mail is in here — which is exactly what staff should not be
  // thinking about. The API refuses them regardless; this is the courtesy half.
  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.ownerOnly || user?.role === "owner",
        ),
      })).filter((section) => section.items.length > 0),
    [user?.role],
  );

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
        {sections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40">
              {section.label}
            </p>
            {section.items.map((item) =>
              item.children?.length ? (
                <NavGroup
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ) : (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        ))}
      </div>

      {/* Premium footer with enhanced user profile - green accent on dark navy */}
      <div className="border-t border-sidebar-border/50 bg-sidebar/95 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/70 px-3 py-3">
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors hover:opacity-90"
            title="Account settings"
          >
            <UserAvatar user={user} tone="success" className="shadow-lg shadow-success/20" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.full_name ?? "—"}
              </p>
              <p className="truncate text-xs font-medium text-sidebar-foreground/60">
                {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
              </p>
            </div>
          </Link>
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

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
  nested = false,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-xl font-semibold tracking-tight transition-all duration-200",
        nested ? "gap-3 px-3 py-2 text-[13px]" : "gap-3.5 px-3.5 py-2.5 text-sm",
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
          "shrink-0 transition-all duration-200",
          nested ? "size-4" : "size-[18px]",
          active
            ? "text-white scale-110"
            : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground group-hover:scale-105",
        )}
        strokeWidth={active ? 2.5 : 2}
      />
      {item.label}
    </Link>
  );
}

/** A menu entry with a sub-menu (Email → Inbox, Sent). Open while the current
 *  page is inside it; otherwise toggled by hand. */
function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const inside = isActive(pathname, item.href);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? inside;
  const Icon = item.icon;
  const children = item.children ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        className={cn(
          "group relative flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
          inside
            ? "text-white"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0 transition-all duration-200",
            inside
              ? "text-white"
              : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
          )}
          strokeWidth={inside ? 2.5 : 2}
        />
        {item.label}
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open && (
        <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border/60 pl-2">
          {children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              active={isActive(pathname, child.href)}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
