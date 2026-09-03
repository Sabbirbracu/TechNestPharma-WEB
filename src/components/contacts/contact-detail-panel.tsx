"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Star,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "@/components/inbox/compose-dialog";
import { useAuth } from "@/lib/auth";
import { useContact } from "@/lib/queries";
import { flagFor } from "@/lib/search-facets";
import type { SearchChannel } from "@/types/api";

/** "Daisy Dai" → "DD" — same rule used for the tender activity feed's avatar. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * The selected contact's detail panel — company, how to reach them, and a
 * way to write to them. No Languages / Region-Market / Products-of-Interest
 * section: none of that exists on a contact today, and showing empty
 * placeholders for fields nobody can fill in yet would read as broken rather
 * than simply unbuilt.
 */
export function ContactDetailPanel({
  contactId,
  onClose,
}: {
  contactId: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data: contact, isLoading } = useContact(contactId);
  const [composing, setComposing] = useState(false);

  if (isLoading || !contact) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const email = contact.channels.find((channel) => channel.channel === "email");
  const phone = contact.channels.find((channel) => channel.channel === "phone");
  const mobile = contact.channels.find((channel) => channel.channel === "mobile");
  const wechat = contact.channels.find((channel) => channel.channel === "wechat");
  const flag = contact.company.country ? flagFor(contact.company.country.iso2) : null;
  const canSend = user?.role === "owner";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/60 p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initialsFromName(contact.name_en)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-foreground">{contact.name_en}</h2>
          {contact.designation && (
            <p className="truncate text-xs font-semibold text-foreground/80">
              {contact.designation}
            </p>
          )}
          {contact.department && (
            <p className="truncate text-xs font-medium text-muted-foreground">
              {contact.department}
            </p>
          )}
          {contact.is_primary && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
              <Star className="size-2.5 fill-current" />
              Primary
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground" title={contact.company.name_en}>
                {contact.company.name_en}
              </p>
              {contact.company.country && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  {flag && <span aria-hidden>{flag}</span>}
                  {contact.company.country.name}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/companies/${contact.company.id}`}
            className="shrink-0 text-[11px] font-bold text-primary hover:underline"
          >
            View Company
          </Link>
        </div>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Contact Information
          </h3>
          <div className="space-y-1.5">
            {email && (
              <ChannelRow icon={Mail} label="Email" channel={email} href={`mailto:${email.value}`} />
            )}
            {phone && (
              <ChannelRow icon={Phone} label="Phone" channel={phone} href={`tel:${phone.value}`} />
            )}
            {mobile && (
              <ChannelRow
                icon={Smartphone}
                label="Mobile"
                channel={mobile}
                href={`tel:${mobile.value}`}
              />
            )}
            {wechat && <ChannelRow icon={MessageCircle} label="WeChat" channel={wechat} />}
            {contact.department && (
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <Briefcase className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Department
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {contact.department}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {contact.notes && (
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <p className="rounded-lg bg-secondary/30 px-3 py-2.5 text-xs font-medium leading-relaxed text-foreground/80">
              {contact.notes}
            </p>
          </section>
        )}
      </div>

      <footer className="border-t border-border/60 p-4">
        {/* Same compose dialog the Inbox uses. It sends through
            `/mailbox/inbox/send`, which is owner-only because it sends from
            the client's own Gmail — so staff get the button explained rather
            than a 403 they cannot act on. */}
        <Button
          type="button"
          onClick={() => setComposing(true)}
          disabled={!email || !canSend}
          title={
            !email
              ? "No email address on file for this contact"
              : !canSend
                ? "Only the account owner can send email from the connected mailbox"
                : undefined
          }
          className="w-full"
        >
          <Send strokeWidth={2.25} />
          Send Message / Email
        </Button>
      </footer>

      {/* Conditionally mounted and keyed on the recipient, so switching
          contacts never carries the previous draft into the next compose. */}
      {composing && email && (
        <ComposeDialog
          key={`contact:${contact.id}`}
          onClose={() => setComposing(false)}
          initialTo={email.value}
        />
      )}
    </div>
  );
}

function ChannelRow({
  icon: Icon,
  label,
  channel,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  channel: SearchChannel;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-foreground">{channel.value}</p>
      </div>
      {href ? (
        <a
          href={href}
          aria-label={`${label.toLowerCase()} ${channel.value}`}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(channel.value);
            toast.success(`Copied ${label}`, { duration: 3000 });
          }}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Copy className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
