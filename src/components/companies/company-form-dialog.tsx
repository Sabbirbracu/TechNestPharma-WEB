"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCountries, useUpdateCompany } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { CompanyDetail } from "@/types/api";

const COMPANY_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "trader", label: "Trader" },
  { value: "manufacturer_trader", label: "Mfr + Trader" },
  { value: "agent", label: "Agent" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
] as const;

const formSchema = z.object({
  name_en: z.string().min(1, "Name is required"),
  name_cn: z.string(),
  short_name: z.string(),
  company_type: z.enum(COMPANY_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  status: z.enum(STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  country_id: z.string(),
  city: z.string(),
  address: z.string(),
  website: z.string(),
  is_watchlisted: z.boolean(),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function valuesFromCompany(company: CompanyDetail): FormValues {
  return {
    name_en: company.name_en,
    name_cn: company.name_cn ?? "",
    short_name: company.short_name ?? "",
    company_type: company.company_type,
    status: company.status,
    country_id: company.country ? String(company.country.id) : "",
    city: company.city ?? "",
    address: company.address ?? "",
    website: company.website ?? "",
    is_watchlisted: company.is_watchlisted,
    notes: company.notes ?? "",
  };
}

/** Edit modal for the company record itself — name, classification, location,
 *  and notes (FR-CO). Triggered from the name/hero section of the detail
 *  page rather than a separate settings screen. */
export function CompanyFormDialog({
  open,
  onClose,
  company,
}: {
  open: boolean;
  onClose: () => void;
  company: CompanyDetail;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: countries } = useCountries();
  const updateCompany = useUpdateCompany(company.id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valuesFromCompany(company),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(valuesFromCompany(company));
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed only on the open transition
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await updateCompany.mutateAsync({
        name_en: values.name_en,
        name_cn: values.name_cn || null,
        short_name: values.short_name || null,
        company_type: values.company_type as CompanyDetail["company_type"],
        status: values.status as CompanyDetail["status"],
        country_id: values.country_id ? Number(values.country_id) : null,
        city: values.city || null,
        address: values.address || null,
        website: values.website || null,
        is_watchlisted: values.is_watchlisted,
        notes: values.notes || null,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save this company. Is the API running?";
      setError("root", { message });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="company-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="company-dialog-title" className="text-base font-bold text-foreground">
              Edit Company
            </h2>
            <p className="text-xs text-muted-foreground">Update name and company details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-6" noValidate>
          {errors.root && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">{errors.root.message}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Name *
              </label>
              <Input autoFocus placeholder="Company name" {...register("name_en")} />
              {errors.name_en && (
                <p className="text-xs font-medium text-destructive">{errors.name_en.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Chinese name
              </label>
              <Input placeholder="中文名 (optional)" {...register("name_cn")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Short name
              </label>
              <Input placeholder="e.g. AHAINT" {...register("short_name")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Type
              </label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("company_type")}
              >
                {COMPANY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("status")}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Country
              </label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("country_id")}
              >
                <option value="">—</option>
                {countries?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                City
              </label>
              <Input placeholder="City" {...register("city")} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Website
              </label>
              <Input placeholder="www.example.com" {...register("website")} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Address
              </label>
              <Input placeholder="Street address" {...register("address")} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Internal notes"
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm placeholder:text-muted-foreground/60 placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("notes")}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...register("is_watchlisted")}
            />
            Watchlisted
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
