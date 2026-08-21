"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Building2,
  Check,
  FlaskConical,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  useCompanies,
  useCountries,
  useCreateCompany,
  useCreateOffer,
  useCreateProduct,
  useTherapeuticCategories,
  useUpdateProduct,
} from "@/lib/queries";
import { CategoryPicker, Field } from "./product-form-dialog";
import { CATEGORY_FILTER_OPTIONS } from "./product-taxonomy";
import type { CompanyListItem } from "@/types/api";
import type { CompanyType, LeadSource, MaterialType } from "@/types/domain";

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "trader", label: "Trader" },
  { value: "manufacturer_trader", label: "Mfr + Trader" },
  { value: "agent", label: "Agent" },
];

const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "trade_fair", label: "Trade fair" },
  { value: "referral", label: "Referral" },
  { value: "email", label: "Email" },
  { value: "web", label: "Web" },
  { value: "existing_relationship", label: "Existing relationship" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  // Product (FR-PROD) — the substance itself, shared by every supplier.
  name_en: z.string().min(1, "Product name is required"),
  name_cn: z.string(),
  variant: z.string(),
  cas: z.string(),
  molecular_formula: z.string(),
  category_ids: z.array(z.number()),
  indication_text: z.string(),
  notes: z.string(),

  // New-company fields — only validated when `company_mode` is "new".
  new_company_name_en: z.string(),
  new_company_name_cn: z.string(),
  new_company_short_name: z.string(),
  new_company_type: z.string(),
  new_company_lead_source: z.string(),
  new_company_country_id: z.string(),
  new_company_city: z.string(),
  new_company_address: z.string(),
  new_company_website: z.string(),
  new_company_notes: z.string(),

  // Offer (FR-OFFER) — this supplier's own answer for the substance above.
  offer_material_type: z.string(),
  spec_text: z.string(),
  qualification_text: z.string(),
  packing_text: z.string(),
  price_min: z.string(),
  price_max: z.string(),
  currency: z.string(),
  price_unit: z.string(),
  moq: z.string(),
  moq_unit: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  name_en: "",
  name_cn: "",
  variant: "",
  cas: "",
  molecular_formula: "",
  category_ids: [],
  indication_text: "",
  notes: "",
  new_company_name_en: "",
  new_company_name_cn: "",
  new_company_short_name: "",
  new_company_type: "manufacturer",
  new_company_lead_source: "trade_fair",
  new_company_country_id: "",
  new_company_city: "",
  new_company_address: "",
  new_company_website: "",
  new_company_notes: "",
  offer_material_type: "",
  spec_text: "",
  qualification_text: "",
  packing_text: "",
  price_min: "",
  price_max: "",
  currency: "",
  price_unit: "",
  moq: "",
  moq_unit: "",
};

/**
 * Add a product from scratch (FR-PROD, FR-OFFER, FR-CO-05).
 *
 * A full page rather than a modal: creating a product here also means
 * answering who supplies it, and that supplier may not exist yet — a company
 * form nested inside a product-form dialog has nowhere to breathe. Three
 * things get written on submit: the product (global, substance-level), the
 * company (only if "new" is picked), and the offer that links the two with
 * this supplier's own spec — the same three-way split the company detail
 * page's own add-product dialog uses, just without a company already fixed.
 */
export function ProductCreateForm() {
  const router = useRouter();
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    "existing",
  );
  const [existingCompany, setExistingCompany] = useState<CompanyListItem | null>(
    null,
  );

  const { data: therapeuticCategories } = useTherapeuticCategories();
  const { data: countries } = useCountries();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createCompany = useCreateCompany();
  // The id is only used to invalidate that company's own detail-page cache;
  // a brand-new company has no such cache yet, so 0 (never a real id) is a
  // harmless placeholder until an existing one is actually picked.
  const createOffer = useCreateOffer(existingCompany?.id ?? 0);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  async function onSubmit(values: FormValues) {
    if (companyMode === "existing" && !existingCompany) {
      setError("root", {
        message: "Select an existing company, or switch to “New company”.",
      });
      return;
    }
    if (companyMode === "new" && !values.new_company_name_en.trim()) {
      setError("new_company_name_en", { message: "Company name is required" });
      return;
    }

    try {
      let companyId: number;
      if (companyMode === "existing") {
        companyId = existingCompany!.id;
      } else {
        const result = await createCompany.mutateAsync({
          name_en: values.new_company_name_en,
          name_cn: values.new_company_name_cn || null,
          short_name: values.new_company_short_name || null,
          company_type: values.new_company_type as CompanyType,
          lead_source: values.new_company_lead_source as LeadSource,
          country_id: values.new_company_country_id
            ? Number(values.new_company_country_id)
            : null,
          city: values.new_company_city || null,
          address: values.new_company_address || null,
          website: values.new_company_website || null,
          notes: values.new_company_notes || null,
        });
        companyId = result.company.id;
      }

      const { product } = await createProduct.mutateAsync({
        name_en: values.name_en,
        name_cn: values.name_cn || null,
        variant: values.variant || null,
        cas: values.cas.trim() || null,
        molecular_formula: values.molecular_formula || null,
        indication_text: values.indication_text || null,
        notes: values.notes || null,
      });

      // `ProductCreate` has no therapeutic axis (backend keeps a bare create
      // separate from categorising it) — a follow-up PATCH applies it, same
      // as the edit dialog does for an existing product.
      if (values.category_ids.length > 0) {
        await updateProduct.mutateAsync({
          id: product.id,
          category_ids: values.category_ids,
        });
      }

      await createOffer.mutateAsync({
        company_id: companyId,
        product_id: product.id,
        material_type: (values.offer_material_type ||
          null) as MaterialType | null,
        spec_text: values.spec_text || null,
        qualification_text: values.qualification_text || null,
        packing_text: values.packing_text || null,
        price_min: values.price_min || null,
        price_max: values.price_max || null,
        currency: values.currency || null,
        price_unit: values.price_unit || null,
        moq: values.moq || null,
        moq_unit: values.moq_unit || null,
      });

      toast.success(`Added ${values.name_en}`, { duration: 6000 });
      router.push("/products");
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : "Could not save this product. Is the API running?",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {errors.root && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            {errors.root.message}
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConical className="size-4.5" strokeWidth={2.5} />
          </span>
          <div>
            <CardTitle className="text-base">Product details</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">
              The substance itself — shared by every supplier that offers it
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name *" className="sm:col-span-2 lg:col-span-2">
            <Input
              autoFocus
              placeholder="e.g. Dexamethasone"
              {...register("name_en")}
            />
            {errors.name_en && (
              <p className="text-xs font-medium text-destructive">
                {errors.name_en.message}
              </p>
            )}
          </Field>

          <Field label="Chinese name">
            <Input placeholder="中文名 (optional)" {...register("name_cn")} />
          </Field>

          <Field label="Variant">
            <Input
              placeholder="e.g. K30, For Injection"
              {...register("variant")}
            />
          </Field>

          <Field label="CAS number">
            <Input
              placeholder="e.g. 103-90-2"
              className="font-mono"
              {...register("cas")}
            />
          </Field>

          <Field label="Molecular formula">
            <Input
              placeholder="e.g. C8H9NO2"
              className="font-mono"
              {...register("molecular_formula")}
            />
          </Field>

          <Field label="Indication">
            <Input
              placeholder="e.g. Analgesic, Antipyretic"
              {...register("indication_text")}
            />
          </Field>

          <Field
            label="Therapeutic class"
            className="sm:col-span-2 lg:col-span-3"
          >
            <Controller
              control={control}
              name="category_ids"
              render={({ field }) => (
                <CategoryPicker
                  value={field.value}
                  onChange={field.onChange}
                  options={therapeuticCategories ?? []}
                />
              )}
            />
          </Field>

          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <textarea
              rows={3}
              placeholder="Anything worth recording about this substance"
              className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              {...register("notes")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-4.5" strokeWidth={2.5} />
          </span>
          <div>
            <CardTitle className="text-base">Supplier</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">
              Who offers it — pick an existing company or add a new one
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setCompanyMode("existing")}
              className={
                companyMode === "existing"
                  ? "rounded-lg bg-card px-4 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  : "rounded-lg px-4 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              Existing company
            </button>
            <button
              type="button"
              onClick={() => setCompanyMode("new")}
              className={
                companyMode === "new"
                  ? "rounded-lg bg-card px-4 py-1.5 text-xs font-bold text-foreground shadow-sm"
                  : "rounded-lg px-4 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              New company
            </button>
          </div>

          {companyMode === "existing" ? (
            <CompanyPicker value={existingCompany} onChange={setExistingCompany} />
          ) : (
            <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company name *" className="sm:col-span-2 lg:col-span-2">
                <Input
                  placeholder="e.g. Zhejiang Hisun Pharmaceutical"
                  {...register("new_company_name_en")}
                />
                {errors.new_company_name_en && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.new_company_name_en.message}
                  </p>
                )}
              </Field>
              <Field label="Chinese name">
                <Input placeholder="中文名" {...register("new_company_name_cn")} />
              </Field>
              <Field label="Short name">
                <Input placeholder="HISUN" {...register("new_company_short_name")} />
              </Field>
              <Field label="Type">
                <Select {...register("new_company_type")}>
                  {COMPANY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="How you met them">
                <Select {...register("new_company_lead_source")}>
                  {LEAD_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country">
                <Select {...register("new_company_country_id")}>
                  <option value="">—</option>
                  {(countries ?? []).map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="City">
                <Input {...register("new_company_city")} />
              </Field>
              <Field label="Website">
                <Input
                  placeholder="www.example.com"
                  {...register("new_company_website")}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2 lg:col-span-3">
                <Input {...register("new_company_address")} />
              </Field>
              <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  rows={2}
                  className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...register("new_company_notes")}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-4.5" strokeWidth={2.5} />
          </span>
          <div>
            <CardTitle className="text-base">Offer details</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">
              This supplier&rsquo;s own spec, packaging, and price for the substance above
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Material type (this supplier)">
            <Select {...register("offer_material_type")}>
              <option value="">—</option>
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Specification">
            <Input placeholder="This supplier's spec" {...register("spec_text")} />
          </Field>

          <Field label="Qualification / Approval">
            <Input
              placeholder="e.g. WHO-GMP, CEP, DMF"
              {...register("qualification_text")}
            />
          </Field>

          <Field label="Packing / Details" className="sm:col-span-2 lg:col-span-3">
            <Input placeholder="e.g. 25kg drum" {...register("packing_text")} />
          </Field>

          <Field label="Price min">
            <Input placeholder="e.g. 120" {...register("price_min")} />
          </Field>

          <Field label="Price max">
            <Input placeholder="Leave blank for a fixed price" {...register("price_max")} />
          </Field>

          <Field label="Currency">
            <Input placeholder="e.g. USD" {...register("currency")} />
          </Field>

          <Field label="Price unit">
            <Input placeholder="e.g. per kg" {...register("price_unit")} />
          </Field>

          <Field label="MOQ">
            <Input placeholder="e.g. 25" {...register("moq")} />
          </Field>

          <Field label="MOQ unit">
            <Input placeholder="e.g. kg" {...register("moq_unit")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2.5 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/products")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Add product
        </Button>
      </div>
    </form>
  );
}

/**
 * Search-as-you-type company lookup. A plain `<select>` doesn't scale to a
 * catalogue with thousands of suppliers, so this hits the same paginated
 * `/companies` list the Companies page uses, filtered server-side by name.
 */
function CompanyPicker({
  value,
  onChange,
}: {
  value: CompanyListItem | null;
  onChange: (company: CompanyListItem | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useCompanies({
    q: query,
    size: 8,
    sort: "name_en",
    order: "asc",
  });
  const results = data?.items ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-input bg-secondary/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {value.name_en}
            </p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {[value.short_name, value.country?.name]
                .filter(Boolean)
                .join(" · ") || "Selected supplier"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          placeholder="Search companies by name…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-10"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
          {isFetching ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs italic text-muted-foreground">
              No company matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((company) => (
              <button
                key={company.id}
                type="button"
                // Fires before blur closes the list, so the click still lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(company);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/60"
              >
                <span className="text-sm font-semibold text-foreground">
                  {company.name_en}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {[company.short_name, company.country?.name]
                    .filter(Boolean)
                    .join(" · ") || "No further details on file"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
