import type { Metadata } from "next";
import Link from "next/link";
import { Upload, UserRound } from "lucide-react";
import { ContactStatCards } from "@/components/contacts/contact-stat-cards";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { AddContactButton } from "@/components/contacts/add-contact-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tile-blue-bg text-tile-blue ring-1 ring-inset ring-tile-blue/15 sm:size-12">
            <UserRound className="size-5 sm:size-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Contacts
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Manage all supplier and manufacturer contacts in one place.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* Contacts don't have their own import channel — the sheet importer
              already picks up contact rows off the supplier sheet, so this
              points at that real flow rather than a separate one. */}
          <Link href="/imports" className={cn(buttonVariants({ variant: "outline" }))}>
            <Upload strokeWidth={2.25} />
            Import Contacts
          </Link>
          <AddContactButton />
        </div>
      </div>

      <ContactStatCards />
      <ContactsTable />
    </div>
  );
}
