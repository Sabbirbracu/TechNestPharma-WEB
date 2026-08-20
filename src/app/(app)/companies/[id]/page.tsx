"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  Loader2,
  AlertCircle,
  MapPin,
  Star,
  User,
  Mail,
  Phone,
  Package,
  Users,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Printer,
  Pencil,
  UserPlus,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { useCompany } from "@/lib/queries";
import { CompanyProductsTable } from "@/components/companies/company-products-table";
import { ContactFormDialog } from "@/components/companies/contact-form-dialog";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { ProductFormDialog } from "@/components/companies/product-form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompanyStatus, CompanyType } from "@/types/domain";

const TYPE_LABEL: Record<CompanyType, string> = {
  manufacturer: "Manufacturer",
  trader: "Trader",
  manufacturer_trader: "Mfr + Trader",
  agent: "Agent",
};

const STATUS_VARIANT: Record<
  CompanyStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
};

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const companyId = Number(id);
  const { data: company, isLoading, error } = useCompany(companyId);

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/companies"
        className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-accent">
          <ArrowLeft className="size-4" />
        </div>
        Back to Companies
      </Link>

      {isLoading && (
        <div
          role="status"
          className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card/50 backdrop-blur-sm"
        >
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading company details...</p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">
              Could not load company details
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
          </div>
        </div>
      )}

      {company && (
        <>
          <CompanyHero company={company} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Package}
              label="Products"
              value={company.contacts.length > 0 ? "Active" : "—"}
              variant="blue"
            />
            <StatCard
              icon={Users}
              label="Contacts"
              value={company.contacts.length.toString()}
              variant="green"
            />
            <StatCard
              icon={Briefcase}
              label="Type"
              value={TYPE_LABEL[company.company_type] ?? company.company_type}
              variant="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label="Status"
              value={company.status.charAt(0).toUpperCase() + company.status.slice(1)}
              variant={company.status === "active" ? "green" : "blue"}
            />
          </div>

          <CompanyContacts companyId={companyId} contacts={company.contacts} />
          <CompanyProducts companyId={companyId} />
        </>
      )}
    </div>
  );
}

function CompanyHero({
  company,
}: {
  company: NonNullable<ReturnType<typeof useCompany>["data"]>;
}) {
  const location = [company.city, company.country?.name]
    .filter(Boolean)
    .join(", ");
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="relative overflow-hidden border-none shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <CardContent className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 sm:gap-5">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-hover shadow-xl ring-4 ring-primary/10 sm:size-20">
              <Building2 className="size-8 text-white drop-shadow-sm sm:size-10" strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {company.name_en}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 bg-card/80"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                {company.is_watchlisted && (
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 ring-2 ring-warning/20">
                    <Star
                      className="size-5 fill-warning text-warning drop-shadow-sm"
                      aria-label="Watchlisted"
                    />
                  </div>
                )}
              </div>

              {company.name_cn && (
                <p className="text-lg font-medium text-muted-foreground">
                  {company.name_cn}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={STATUS_VARIANT[company.status] ?? "secondary"}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm"
                >
                  {company.status}
                </Badge>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {TYPE_LABEL[company.company_type] ?? company.company_type}
                </Badge>

                {(location || company.website) && (
                  <div className="h-5 w-px bg-border" />
                )}

                {location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    <span className="font-medium">{location}</span>
                  </div>
                )}

                {company.website &&
                  company.website
                    .split(/[;,]\s*/)
                    .map((site) => site.trim())
                    .filter(Boolean)
                    .map((site) => (
                      <a
                        key={site}
                        href={site.startsWith("http") ? site : `https://${site}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary-hover"
                      >
                        <Globe className="size-4" />
                        <span className="font-medium underline decoration-primary/30 underline-offset-2 group-hover:decoration-primary">
                          {site}
                        </span>
                        <ExternalLink className="size-3 opacity-60" />
                      </a>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CompanyFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        company={company}
      />
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  variant?: "blue" | "green";
}) {
  const colors = {
    blue: {
      bg: "from-primary/10 via-primary/5 to-background",
      icon: "bg-primary/10 text-primary",
      ring: "ring-primary/10",
    },
    green: {
      bg: "from-success/10 via-success/5 to-background",
      icon: "bg-success/10 text-success",
      ring: "ring-success/10",
    },
  };

  return (
    <Card className={`overflow-hidden border-none shadow-md transition-all hover:shadow-lg ${colors[variant].ring} ring-1`}>
      <CardContent className={`bg-gradient-to-br p-5 ${colors[variant].bg}`}>
        <div className="flex items-center gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${colors[variant].icon}`}
          >
            <Icon className="size-6" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 truncate text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyContacts({
  companyId,
  contacts,
}: {
  companyId: number;
  contacts: NonNullable<ReturnType<typeof useCompany>["data"]>["contacts"];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-success/10">
            <Users className="size-5 text-success" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Contacts</h2>
            <p className="text-xs text-muted-foreground">
              {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} on file
            </p>
          </div>
        </div>
        {contacts.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <User className="size-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">
              No contacts available
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Contact information will appear here when added
            </p>
            <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
              <UserPlus className="size-4" />
              Add contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full space-y-3">
          {contacts.map((contact) => {
            // Extract ALL channels
            const emailChannels = contact.channels.filter(ch => ch.channel === 'email');
            const phoneChannels = contact.channels.filter(ch => ch.channel === 'phone' || ch.channel === 'mobile');
            const whatsappChannels = contact.channels.filter(ch => ch.channel === 'whatsapp');
            const faxChannels = contact.channels.filter(ch => ch.channel === 'fax');

            const initials = contact.name_en
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <Card
                key={contact.id}
                className="group w-full overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-lg font-bold text-white shadow-lg ring-4 ring-primary/10 sm:size-16">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground sm:text-lg">
                            {contact.name_en}
                          </h3>
                          {contact.is_primary && (
                            <Badge
                              variant="secondary"
                              className="shrink-0 bg-primary/10 text-[10px] font-bold text-primary"
                            >
                              PRIMARY
                            </Badge>
                          )}
                        </div>
                        {(contact.designation || contact.department) && (
                          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                            {[contact.designation, contact.department]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {emailChannels.map((emailChannel, idx) => (
                        <a
                          key={`email-${idx}`}
                          href={`mailto:${emailChannel.value}`}
                          className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 transition-all hover:bg-blue-100 hover:shadow-md"
                          title={emailChannel.value}
                        >
                          <div className="flex size-8 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                            <Mail className="size-4 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-medium text-blue-700">
                            {emailChannel.value}
                          </span>
                        </a>
                      ))}

                      {phoneChannels.map((phoneChannel, idx) => (
                        <a
                          key={`phone-${idx}`}
                          href={`tel:${phoneChannel.value}`}
                          className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 transition-all hover:bg-green-100 hover:shadow-md"
                          title={phoneChannel.value}
                        >
                          <div className="flex size-8 items-center justify-center rounded-full bg-green-500 shadow-sm">
                            <Phone className="size-4 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-medium text-green-700">
                            {phoneChannel.value}
                          </span>
                        </a>
                      ))}

                      {whatsappChannels.map((whatsappChannel, idx) => (
                        <a
                          key={`whatsapp-${idx}`}
                          href={`https://wa.me/${whatsappChannel.value.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 transition-all hover:bg-emerald-100 hover:shadow-md"
                          title={whatsappChannel.value}
                        >
                          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                            <FaWhatsapp className="size-4 text-white" />
                          </div>
                          <span className="text-xs font-medium text-emerald-700">
                            {whatsappChannel.value}
                          </span>
                        </a>
                      ))}

                      {faxChannels.map((faxChannel, idx) => (
                        <div
                          key={`fax-${idx}`}
                          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2"
                          title={faxChannel.value}
                        >
                          <div className="flex size-8 items-center justify-center rounded-full bg-slate-500 shadow-sm">
                            <Printer className="size-4 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-medium text-slate-700">
                            {faxChannel.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        companyId={companyId}
        contacts={contacts}
      />
    </section>
  );
}

function CompanyProducts({ companyId }: { companyId: number }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Package className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Product Catalogue</h2>
            <p className="text-xs text-muted-foreground">
              Complete list of products with specifications
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Package className="size-4" />
          Add Product
        </Button>
      </div>
      <CompanyProductsTable companyId={companyId} />

      <ProductFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        companyId={companyId}
      />
    </section>
  );
}
