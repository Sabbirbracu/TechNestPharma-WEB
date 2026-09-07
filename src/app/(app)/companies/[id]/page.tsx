"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useCompany } from "@/lib/queries";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { ContactFormDialog } from "@/components/companies/contact-form-dialog";
import { ProductFormDialog } from "@/components/companies/product-form-dialog";
import { CompanyPageActions } from "@/components/companies/detail/company-page-actions";
import { CompanyBanner } from "@/components/companies/detail/company-banner";
import { CompanyOverview } from "@/components/companies/detail/company-overview";
import { CompanyContacts } from "@/components/companies/detail/company-contacts";
import { CompanyCatalogue } from "@/components/companies/detail/company-catalogue";
import { CompanyDocuments } from "@/components/companies/detail/company-documents";
import { CompanyNotes } from "@/components/companies/detail/company-notes";
import type { CompanyContact, CompanyDetail } from "@/types/api";

/**
 * One supplier's profile.
 *
 * Five stacked cards, in the order the desk reads them: who they are, what we
 * know and what we can do about it, who to call, what they sell, and the
 * paperwork and running note behind all of it. The page itself only owns the
 * dialogs — every card is its own component under `companies/detail`, because
 * they open the same three editors and something has to hold that state above
 * all of them.
 */
export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const companyId = Number(id);
  const { data: company, isLoading, error } = useCompany(companyId);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div
          role="status"
          className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm"
        >
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 size-7 animate-spin text-success" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading company details…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div
          role="alert"
          className="flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-5 text-destructive" />
          </span>
          <div>
            <p className="font-semibold text-destructive">
              Could not load company details
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <CompanyProfile company={company} />;
}

function CompanyProfile({ company }: { company: CompanyDetail }) {
  const [editingCompany, setEditingCompany] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  // `null` means the roster dialog is shut; an array is who it opens on — one
  // person when a row's Edit was clicked, empty when adding someone new.
  const [contactsInDialog, setContactsInDialog] = useState<CompanyContact[] | null>(
    null,
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <CompanyPageActions
        company={company}
        onEdit={() => setEditingCompany(true)}
        onAddContact={() => setContactsInDialog([])}
      />

      <CompanyBanner company={company} />

      <CompanyOverview
        company={company}
        onEdit={() => setEditingCompany(true)}
        onCreateOffer={() => setAddingProduct(true)}
      />

      <CompanyContacts
        contacts={company.contacts}
        onAdd={() => setContactsInDialog([])}
        onEdit={(contact) => setContactsInDialog([contact])}
      />

      <CompanyCatalogue
        companyId={company.id}
        onAddProduct={() => setAddingProduct(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <CompanyDocuments companyId={company.id} />
        <CompanyNotes company={company} />
      </div>

      <CompanyFormDialog
        open={editingCompany}
        onClose={() => setEditingCompany(false)}
        company={company}
      />

      <ContactFormDialog
        open={contactsInDialog !== null}
        onClose={() => setContactsInDialog(null)}
        companyId={company.id}
        contacts={contactsInDialog ?? []}
      />

      <ProductFormDialog
        open={addingProduct}
        onClose={() => setAddingProduct(false)}
        companyId={company.id}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/companies"
      className="group inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft
        className="size-4 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={2.2}
      />
      Back to Companies
    </Link>
  );
}
