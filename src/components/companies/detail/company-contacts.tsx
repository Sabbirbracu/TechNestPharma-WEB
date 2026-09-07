"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  Copy,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Printer,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteContact } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  GREEN_BUTTON,
  IconButton,
  OUTLINE_BUTTON,
  SectionCard,
} from "@/components/companies/detail/section-card";
import type { CompanyContact } from "@/types/api";

/** How each channel reads in the contact row. `qr_image` is a photo and has no
 *  useful inline form, so it is left out of the strip entirely. */
const CHANNEL_STYLE: Record<
  string,
  { icon: typeof Mail; className: string; href?: (value: string) => string }
> = {
  email: {
    icon: Mail,
    className: "bg-tile-blue-bg text-tile-blue",
    href: (value) => `mailto:${value}`,
  },
  phone: {
    icon: Phone,
    className: "bg-success/12 text-success",
    href: (value) => `tel:${value.replace(/\s+/g, "")}`,
  },
  mobile: {
    icon: Phone,
    className: "bg-success/12 text-success",
    href: (value) => `tel:${value.replace(/\s+/g, "")}`,
  },
  whatsapp: {
    icon: FaWhatsapp as unknown as typeof Mail,
    className: "bg-success/12 text-success",
    href: (value) => `https://wa.me/${value.replace(/[^0-9]/g, "")}`,
  },
  fax: { icon: Printer, className: "bg-muted text-muted-foreground" },
  wechat: { icon: MessageCircle, className: "bg-success/12 text-success" },
  skype: { icon: MessageCircle, className: "bg-tile-blue-bg text-tile-blue" },
  linkedin: { icon: AtSign, className: "bg-tile-blue-bg text-tile-blue" },
};

const FALLBACK_CHANNEL = {
  icon: AtSign,
  className: "bg-muted text-muted-foreground",
} as const;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy the ${label.toLowerCase()}.`);
  }
}

/**
 * "Key people from this company" — the roster, searchable, with every channel
 * we hold for each person one click from being used.
 *
 * The search is client-side on purpose: contacts arrive embedded in the
 * company payload, so there is nothing to fetch and filtering as you type is
 * free.
 */
export function CompanyContacts({
  contacts,
  onAdd,
  onEdit,
}: {
  contacts: CompanyContact[];
  onAdd: () => void;
  onEdit: (contact: CompanyContact) => void;
}) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) =>
      [
        contact.name_en,
        contact.designation,
        contact.department,
        ...contact.channels.map((channel) => channel.value),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [contacts, search]);

  return (
    <SectionCard
      icon={Users}
      title={`Contacts (${contacts.length})`}
      caption="Key people from this company"
      actions={
        <>
          <div className="relative w-full sm:w-[230px]">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts..."
              aria-label="Search contacts"
              className="h-10 rounded-xl pl-10 text-sm font-normal"
            />
          </div>
          <button type="button" onClick={onAdd} className={GREEN_BUTTON}>
            <UserPlus strokeWidth={2.2} />
            Add Contact
          </button>
        </>
      }
    >
      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts on file"
          body="Add the people you deal with here and their email, phone and WhatsApp stay one click away."
          action={
            <button type="button" onClick={onAdd} className={GREEN_BUTTON}>
              <UserPlus strokeWidth={2.2} />
              Add Contact
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nobody matches that"
          body={`No contact here matches "${search.trim()}".`}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onEdit={() => onEdit(contact)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ContactRow({
  contact,
  onEdit,
}: {
  contact: CompanyContact;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteContact = useDeleteContact();

  const email = contact.channels.find((channel) => channel.channel === "email");
  const phone = contact.channels.find(
    (channel) => channel.channel === "phone" || channel.channel === "mobile",
  );
  const channels = contact.channels.filter(
    (channel) => channel.channel !== "qr_image",
  );

  return (
    <li className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-success/30 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          {initialsFor(contact.name_en)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">
              {contact.name_en}
            </h3>
            {contact.is_primary ? (
              <span className="inline-flex items-center rounded-full bg-tile-blue-bg px-2.5 py-0.5 text-[11px] font-bold text-tile-blue ring-1 ring-inset ring-tile-blue/15">
                Primary
              </span>
            ) : null}
          </div>
          {contact.designation || contact.department ? (
            <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
              {[contact.designation, contact.department].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(OUTLINE_BUTTON, "h-9 px-3.5 text-[13px]")}
          >
            <Pencil strokeWidth={2.2} />
            Edit
          </button>

          <DropdownMenu
            trigger={(props) => (
              <IconButton aria-label={`Actions for ${contact.name_en}`} {...props}>
                <MoreHorizontal strokeWidth={2.2} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                >
                  <Pencil />
                  Edit contact
                </DropdownMenuItem>
                {email ? (
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      void copy(email.value, "Email");
                    }}
                  >
                    <Copy />
                    Copy email
                  </DropdownMenuItem>
                ) : null}
                {phone ? (
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      void copy(phone.value, "Phone number");
                    }}
                  >
                    <Copy />
                    Copy phone number
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    close();
                    setConfirming(true);
                  }}
                >
                  <Trash2 />
                  Delete contact
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          {channels.map((channel, index) => {
            const style = CHANNEL_STYLE[channel.channel] ?? FALLBACK_CHANNEL;
            const Icon = style.icon;
            const href = "href" in style ? style.href?.(channel.value) : undefined;
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    style.className,
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={2.2} />
                </span>
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {channel.value}
                </span>
              </>
            );

            return (
              <div
                key={`${channel.channel}-${index}`}
                className="flex items-center gap-5"
              >
                {index > 0 ? (
                  <span aria-hidden className="h-8 w-px shrink-0 bg-border" />
                ) : null}
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
                    title={`${channel.channel}: ${channel.value}`}
                  >
                    {body}
                  </a>
                ) : (
                  <span
                    className="flex min-w-0 items-center gap-2.5"
                    title={`${channel.channel}: ${channel.value}`}
                  >
                    {body}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Delete this contact?"
          description={
            <>
              <span className="font-semibold text-foreground">
                {contact.name_en}
              </span>{" "}
              will be removed from this company, along with every channel on
              file for them.
            </>
          }
          confirmLabel="Delete"
          busy={deleteContact.isPending}
          onConfirm={() =>
            deleteContact.mutate(contact.id, {
              onError: () => toast.error("Could not delete this contact."),
              onSettled: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </li>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <UserRound className="size-6" strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="max-w-sm text-xs font-medium text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
