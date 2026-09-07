"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Loader2, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationList } from "@/components/notifications/notification-list";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/lib/queries";
import { unlockSound } from "@/lib/notification-sound";
import { useNotificationStream } from "@/lib/use-notification-stream";
import { Sidebar } from "./sidebar";

/**
 * Application chrome: a fixed sidebar on desktop, a slide-over drawer on mobile
 * (NFR-03 — every screen must be usable from a phone on a trade-fair floor).
 * Enhanced with premium glass-morphism and refined shadows.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // One stream per tab, opened here because the shell is the only component
  // that is mounted for the whole authenticated session. Gated on `user` so it
  // never opens before the token exists — the first connection would 401 and
  // burn a refresh for nothing.
  useNotificationStream(Boolean(user));
  const { data: unreadData } = useUnreadCount();
  const unread = unreadData?.unread ?? 0;

  // Browsers refuse to let a page play audio until someone has interacted with
  // it, and `resume()` is only granted from inside a real gesture — not from
  // the network callback that receives a notification. So the audio context is
  // created on the first click anywhere in the app and kept for the session.
  useEffect(() => {
    const onFirstGesture = () => unlockSound();
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  // Closing on Escape covers both overlays; only one is ever open at a time
  // in practice, so there is no ordering to worry about.
  useEffect(() => {
    if (!notifOpen && !profileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notifOpen, profileOpen]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar with subtle shadow */}
      <aside className="hidden w-52 shrink-0 border-r border-sidebar-border bg-sidebar shadow-md lg:block">
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
              onClick={() => setNotifOpen(true)}
              aria-label={
                unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
              }
              aria-expanded={notifOpen}
              className="relative rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105"
            >
              <Bell className="size-5" strokeWidth={2} />
              {/* The count, not a decoration. The old badge pinged whether or
                  not anything had happened, which taught everyone to ignore
                  it — a permanently-lit indicator carries no information. */}
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[1.125rem] text-primary-foreground ring-2 ring-background">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title={user?.full_name}
              aria-label="Account menu"
              aria-expanded={profileOpen}
              className="ml-1 shrink-0 rounded-xl ring-2 ring-background/50 transition-transform hover:scale-105"
            >
              <UserAvatar user={user} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-[1920px] space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>

      {/* Notification tray — slides in from the right, control-centre style */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          notifOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!notifOpen}
      >
        <div
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setNotifOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
            notifOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between border-b border-border/60 bg-gradient-to-br from-primary/[0.13] via-primary/[0.04] to-transparent px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Bell className="size-5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-foreground">Notifications</h2>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {unread > 0
                    ? `${unread} item${unread === 1 ? "" : "s"} need your attention`
                    : "You’re all caught up"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifOpen(false)}
              aria-label="Close notifications"
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
            >
              <X className="size-4.5" />
            </button>
          </div>

          <NotificationList unreadCount={unread} onNavigate={() => setNotifOpen(false)} />
        </aside>
      </div>

      {/* Account menu — anchored under the avatar on desktop, a bottom sheet
          on phones (nothing to anchor it to once the header wraps). */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          profileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!profileOpen}
      >
        <div
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setProfileOpen(false)}
        />
        <div
          role="menu"
          aria-label="Account menu"
          className={`absolute right-4 top-16 w-64 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl transition-all duration-200 ${
            profileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
            <UserAvatar user={user} size="size-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {user?.full_name ?? "—"}
              </p>
              <p className="truncate text-xs font-medium text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
            >
              <Settings />
              Account settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0"
            >
              {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
