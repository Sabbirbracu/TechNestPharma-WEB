import {
  LayoutDashboard,
  Building2,
  Users,
  FlaskConical,
  Gavel,
  ScanLine,
  Handshake,
  Mails,
  Inbox,
  TestTube2,
  FileText,
  Search,
  Upload,
  Settings,
  UserCog,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** SRS functional-requirement group this screen serves. */
  fr: string;
  /**
   * Hidden from anyone but the owner.
   *
   * Only the Inbox uses this today, and for a reason that is about the data
   * rather than about seniority: it reads the client's own Gmail, which holds
   * his personal mail alongside supplier quotations. Staff keep the per-request
   * thread view on Sourcing, which only ever shows a conversation the ERP
   * itself started. The API enforces this; hiding the link is the courtesy
   * half, so nobody clicks through to a 403.
   */
  ownerOnly?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

/**
 * Primary navigation, grouped by workflow. One entry per V1 module
 * (05-architecture §A2 routers / SRS §6). Every visible item is a working
 * screen — no "Coming Soon" stubs, per SRS §2.2.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, fr: "FR-DASH" },
      { label: "Search", href: "/search", icon: Search, fr: "FR-SEARCH" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Companies", href: "/companies", icon: Building2, fr: "FR-CO" },
      { label: "Contacts", href: "/contacts", icon: Users, fr: "FR-CON" },
      { label: "Products", href: "/products", icon: FlaskConical, fr: "FR-PROD" },
      { label: "Offers", href: "/offers", icon: Handshake, fr: "FR-OFFER" },
    ],
  },
  {
    label: "Bidding",
    items: [
      // Notices sit ABOVE tenders because that is the order the work
      // happens in: a notice is captured and reviewed, and the tenders on
      // the board below are what comes out of it.
      {
        label: "Tender Notices",
        href: "/tender-notices",
        icon: ScanLine,
        fr: "FR-TENDER",
      },
      { label: "Tenders", href: "/tenders", icon: Gavel, fr: "FR-TENDER" },
      { label: "Sourcing", href: "/sourcing", icon: Mails, fr: "FR-SRC" },
      {
        label: "Inbox",
        href: "/inbox",
        icon: Inbox,
        fr: "FR-SRC",
        ownerOnly: true,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Samples", href: "/samples", icon: TestTube2, fr: "FR-SAMP" },
      { label: "Documents", href: "/documents", icon: FileText, fr: "FR-DOC" },
      { label: "Import", href: "/imports", icon: Upload, fr: "FR-IMP" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: UserCog, fr: "FR-ADM" },
      { label: "Activity Logs", href: "/admin/activity", icon: ScrollText, fr: "FR-ADM-02" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, fr: "FR-AUTH" },
    ],
  },
];

/** Flat list, for any consumer that doesn't need the grouping. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
