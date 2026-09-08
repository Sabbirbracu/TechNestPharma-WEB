import {
  CheckCircle2,
  FlaskConical,
  PackageCheck,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { SampleStage } from "@/types/api";
import type { SampleStatus, SampleTestResult } from "@/types/domain";

/**
 * How the eight states read on screen, and how they group into five columns.
 *
 * `promised` and `shipped` are not board columns. They are how far along a
 * chase is, not a different place the parcel sits — and eight columns for a
 * list that is usually a dozen rows is a board nobody scans. They stay visible
 * on the row itself, where "Promised 12 Sep" and "DHL-4471902" are the two
 * things somebody actually needs.
 */
export type StageStyle = {
  key: SampleStage;
  label: string;
  icon: LucideIcon;
  tile: string;
  /** What the number under the label counts. */
  caption: string;
};

export const SAMPLE_STAGES: StageStyle[] = [
  {
    key: "requested",
    label: "Requested",
    icon: Send,
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    caption: "with the supplier",
  },
  {
    key: "received",
    label: "Received",
    icon: PackageCheck,
    tile: "bg-tile-teal-bg text-tile-teal ring-tile-teal/15",
    caption: "here, not yet tested",
  },
  {
    key: "under_test",
    label: "Under Test",
    icon: FlaskConical,
    tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
    caption: "in the lab",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle2,
    tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
    caption: "passed",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XCircle,
    tile: "bg-destructive/10 text-destructive ring-destructive/15",
    caption: "failed",
  },
];

export type StatusStyle = { label: string; badge: string; dot: string };

/** Per-status, because the row says more than the column it sits in: a sample
 *  that is Shipped and one nobody has answered about are both "Requested" on
 *  the board and very different on the desk. */
export const SAMPLE_STATUS_STYLES: Record<SampleStatus, StatusStyle> = {
  requested: {
    label: "Requested",
    badge: "bg-tile-blue-bg text-tile-blue ring-tile-blue/20",
    dot: "bg-tile-blue",
  },
  promised: {
    label: "Promised",
    badge: "bg-tile-blue-bg text-tile-blue ring-tile-blue/20",
    dot: "bg-tile-blue",
  },
  shipped: {
    label: "Shipped",
    badge: "bg-tile-amber-bg text-tile-amber ring-tile-amber/20",
    dot: "bg-tile-amber",
  },
  received: {
    label: "Received",
    badge: "bg-tile-teal-bg text-tile-teal ring-tile-teal/20",
    dot: "bg-tile-teal",
  },
  under_test: {
    label: "Under Test",
    badge: "bg-tile-purple-bg text-tile-purple ring-tile-purple/20",
    dot: "bg-tile-purple",
  },
  approved: {
    label: "Approved",
    badge: "bg-success/10 text-success ring-success/20",
    dot: "bg-success",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-secondary text-muted-foreground ring-border/60",
    dot: "bg-muted-foreground",
  },
};

export const TEST_RESULT_STYLES: Record<SampleTestResult, StatusStyle> = {
  pass: {
    label: "Pass",
    badge: "bg-success/10 text-success ring-success/20",
    dot: "bg-success",
  },
  fail: {
    label: "Fail",
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  conditional: {
    label: "Conditional",
    badge: "bg-tile-amber-bg text-tile-amber ring-tile-amber/20",
    dot: "bg-tile-amber",
  },
};

/**
 * The units a pharma desk actually asks for a sample in.
 *
 * Mass and volume are both here and deliberately never converted between:
 * 5 ml of a solvent and 5 g of a powder are different asks, and a system that
 * silently normalised them would be wrong in a way nobody could see.
 */
export const SAMPLE_UNITS = ["mg", "g", "kg", "ml", "L", "pcs", "vials"] as const;

/** What a status move is called as a button. The verb, not the destination —
 *  "Mark received" is a thing you do; "Received" is a place. */
export const STATUS_ACTION_LABEL: Record<SampleStatus, string> = {
  requested: "Reopen as requested",
  promised: "Supplier promised a date",
  shipped: "Mark shipped",
  received: "Mark received",
  under_test: "Send for testing",
  approved: "Approve",
  rejected: "Reject",
  cancelled: "Cancel",
};

/** Formats "100.000" + "g" as "100 g" — the API sends Numeric as a string, and
 *  trailing zeros are storage precision rather than significant figures. */
export function formatQuantity(
  value: string | null,
  unit: string | null,
): string | null {
  if (!value) return null;
  const trimmed = Number(value).toString();
  return unit ? `${trimmed} ${unit}` : trimmed;
}
