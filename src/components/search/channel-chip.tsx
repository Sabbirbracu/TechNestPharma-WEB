"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Smartphone,
  MessageCircle,
  Printer,
  Link2,
  QrCode,
  Check,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/types/api";

const CHANNEL_META: Record<ChannelType, { label: string; icon: LucideIcon }> = {
  email: { label: "Email", icon: Mail },
  phone: { label: "Phone", icon: Phone },
  mobile: { label: "Mobile", icon: Smartphone },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  wechat: { label: "WeChat", icon: MessageCircle },
  fax: { label: "Fax", icon: Printer },
  skype: { label: "Skype", icon: Link2 },
  linkedin: { label: "LinkedIn", icon: Link2 },
  qr_image: { label: "QR code", icon: QrCode },
};

/** `tel:` / `mailto:` / `wa.me` where the channel supports it; otherwise null. */
function hrefFor(channel: ChannelType, value: string): string | null {
  if (channel === "email") return `mailto:${value}`;
  if (channel === "phone" || channel === "mobile") return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (channel === "whatsapp") return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
  return null;
}

/**
 * One contact channel, sized for a non-technical reader to act on immediately:
 * a labelled icon, the raw value, and a tap-to-copy affordance — no separate
 * "copy" menu to discover. Clicking the value opens tel:/mailto:/wa.me when the
 * platform supports it; the copy button always works, even for WeChat IDs.
 */
export function ChannelChip({
  channel,
  value,
  isPrimary,
}: {
  channel: ChannelType;
  value: string;
  isPrimary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const href = hrefFor(channel, value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be denied by the browser; the value is still
      // visible and selectable, so there is nothing further to do.
    }
  }

  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2 pr-1 text-xs",
        isPrimary
          ? "border-primary/25 bg-primary/5 text-foreground"
          : "border-border bg-secondary/50 text-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {meta.label}
      </span>
      {href ? (
        <a
          href={href}
          className="font-medium underline-offset-2 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="font-medium">{value}</span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${meta.label.toLowerCase()}`}
        title="Copy"
        className="ml-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3 text-success" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
    </span>
  );
}
