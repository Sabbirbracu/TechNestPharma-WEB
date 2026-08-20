"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, AlertTriangle, Building2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useCountries, useCreateCompany } from "@/lib/queries";
import type { SimilarCompany } from "@/types/api";

const COMPANY_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "trader", label: "Trader" },
  { value: "manufacturer_trader", label: "Mfr + Trader" },
  { value: "agent", label: "Agent" },
] as const;

const LEAD_SOURCE_OPTIONS = [
  { value: "trade_fair", label: "Trade fair" },
  { value: "referral", label: "Referral" },
  { value: "email", label: "Email" },
  { value: "web", label: "Web" },
  { value: "existing_relationship", label: "Existing relationship" },
  { value: "other", label: "Other" },
] as const;

const formSchema = z.object({
  name_en: z.string().min(1, "Name is required"),
  name_cn: z.string(),
  short_name: z.string(),
  company_type: z.enum(
    COMPANY_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]],
  ),
  lead_source: z.enum(
    LEAD_SOURCE_OPTIONS.map((o) => o.value) as [string, ...string[]],
  ),
  country_id: z.string(),
  city: z.string(),
  address: z.string(),
  website: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  name_en: "",
  name_cn: "",
  short_name: "",
  company_type: "manufacturer",
  lead_source: "trade_fair",
  country_id: "",
  city: "",
  address: "",
  website: "",
  notes: "",
};

/**
 * Channel A (05-architecture C1): add one supplier by hand.
 *
 * Writes straight through the service layer — no staging and no preview grid,
 * because this is interactive and one record at a time. The API answers with
 * any near-duplicates it noticed; those are shown as a warning and never as a
 * block (FR-CO-05), since two real companies can share a name stem.
 */
export function CompanyCreateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { data: countries } = useCountries();
  const createCompany = useCreateCompany();
  const [warnings, setWarnings] = useState<SimilarCompany[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(EMPTY);
      setWarnings([]);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const result = await createCompany.mutateAsync({
        name_en: values.name_en,
        name_cn: values.name_cn || null,
        short_name: values.short_name || null,
        company_type: values.company_type as "manufacturer",
        lead_source: values.lead_source as "trade_fair",
        country_id: values.country_id ? Number(values.country_id) : null,
        city: values.city || null,
        address: values.address || null,
        website: values.website || null,
        notes: values.notes || null,
      });
      onClose();
      // Straight to the new supplier, which is where its contacts and products
      // get added next — the whole point of entering it.
      router.push(`/companies/${result.company.id}`);
    } catch (caught) {
      setError("root", {
        message:
          caught instanceof ApiError
            ? caught.message
            : "Could not create this company. Is the API running?",
      });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="company-create-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative max-h-[85vh] overflow-y-auto rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="company-create-title"
              className="text-base font-bold text-foreground"
            >
              New company
            </h2>
            <p className="text-xs text-muted-foreground">
              Contacts and products are added on the company&rsquo;s own page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          {errors.root && (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errors.root.message}</span>
            </p>
          )}

          {warnings.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                Similar companies already exist
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {warnings.map((warning) => (
                  <li key={warning.id}>{warning.name_en}</li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Company name" error={errors.name_en?.message} required>
            <Input {...register("name_en")} autoFocus />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Chinese name">
              <Input {...register("name_cn")} />
            </Field>
            <Field label="Short name">
              <Input {...register("short_name")} placeholder="HISUN" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select {...register("company_type")}>
                {COMPANY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="How you met them">
              <Select {...register("lead_source")}>
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Country">
              <Select {...register("country_id")}>
                <option value="">—</option>
                {(countries ?? []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="City">
              <Input {...register("city")} />
            </Field>
          </div>

          <Field label="Address">
            <Input {...register("address")} />
          </Field>

          <Field label="Website">
            <Input {...register("website")} placeholder="www.example.com" />
          </Field>

          <Field label="Notes">
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Create company
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
  );
}

const Select = ({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
  >
    {children}
  </select>
);
