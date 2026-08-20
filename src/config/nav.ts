import {
  LayoutDashboard,
  Building2,
  Users,
  FlaskConical,
  Gavel,
  Handshake,
  TestTube2,
  FileText,
  Search,
  Upload,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** SRS functional-requirement group this screen serves. */
  fr: string;
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
      { label: "Tenders", href: "/tenders", icon: Gavel, fr: "FR-TENDER" },
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
    label: "System",
    items: [
      { label: "Admin", href: "/admin", icon: Settings, fr: "FR-ADM" },
    ],
  },
];

/** Flat list, for any consumer that doesn't need the grouping. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
