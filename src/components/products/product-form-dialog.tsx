"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, FlaskConical, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useProduct,
  useTherapeuticCategories,
  useUpdateProduct,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type {
  ProductDetail,
  ProductListItem,
  TherapeuticCategoryRef,
} from "@/types/api";

const formSchema = z.object({
  name_en: z.string().min(1, "Name is required"),
  name_cn: z.string(),
  variant: z.string(),
  cas: z.string(),
  molecular_formula: z.string(),
  category_ids: z.array(z.number()),
  indication_text: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/** The list row is on screen immediately; the detail request fills in the
 *  fields only `GET /products/{id}` carries. Seeding from whichever has
 *  arrived means the form is editable before the detail lands. */
function valuesFrom(
  row: ProductListItem,
  detail: ProductDetail | undefined,
): FormValues {
  return {
    name_en: detail?.name_en ?? row.name_en,
    name_cn: detail?.name_cn ?? row.name_cn ?? "",
    variant: detail?.variant ?? row.variant ?? "",
    // `cas_raw` is what was printed on the source document; `cas_number` is the
    // normalised form. Editing should show what a human typed, not our
    // canonicalisation of it — the backend re-normalises whatever comes back.
    cas: detail?.cas_raw ?? detail?.cas_number ?? row.cas_number ?? "",
    molecular_formula: detail?.molecular_formula ?? "",
    category_ids: (detail?.categories ?? []).map((category) => category.id),
    indication_text: detail?.indication_text ?? row.indication_text ?? "",
    notes: detail?.notes ?? "",
  };
}

/**
 * Edit the product record itself (FR-PROD).
 *
 * Deliberately limited to fields that belong to the *substance*. Material
 * type, pharmacopoeia, country and price are all properties of a supplier's
 * offer (D14) — the same substance is an API to one supplier and an excipient
 * to another — so editing them here would mean editing every supplier's
 * answer at once. Those belong on the offer.
 */
export function ProductFormDialog({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductListItem;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const updateProduct = useUpdateProduct();
  // Fetched here rather than passed in. The form owns fields the list row does
  // not carry — molecular formula, notes — and a PATCH built from a row alone
  // would send them as null and erase them. When the details dialog opened this,
  // its own request for the same key is already cached, so this costs nothing.
  const { data: detail } = useProduct(open ? product.id : null);

  const { data: therapeuticCategories } = useTherapeuticCategories();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valuesFrom(product, detail),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(valuesFrom(product, detail));
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed only on the open transition
  }, [open, reset]);

  // The detail request usually resolves after the dialog opens. Reseed when it
  // lands, so molecular formula and notes are not blank on a form the user has
  // not touched yet.
  useEffect(() => {
    if (open && detail) reset(valuesFrom(product, detail));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the detail arrives
  }, [detail, open]);

  async function onSubmit(values: FormValues) {
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name_en: values.name_en,
        name_cn: values.name_cn || null,
        variant: values.variant || null,
        // An empty box means "no CAS", which has to reach the API as null —
        // "" would be stored as a CAS that fails every checksum.
        cas: values.cas.trim() || null,
        molecular_formula: values.molecular_formula || null,
        category_ids: values.category_ids,
        indication_text: values.indication_text || null,
        notes: values.notes || null,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save this product. Is the API running?";
      setError("root", { message });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="product-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConical className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="product-dialog-title"
              className="text-base font-bold text-foreground"
            >
              Edit Product
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {product.name_en}
            </p>
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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 px-6 py-6"
          noValidate
        >
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *" className="sm:col-span-2">
              <Input autoFocus placeholder="Product name" {...register("name_en")} />
              {errors.name_en && (
                <p className="text-xs font-medium text-destructive">
                  {errors.name_en.message}
                </p>
              )}
            </Field>

            <Field label="Chinese name" className="sm:col-span-2">
              <Input placeholder="中文名 (optional)" {...register("name_cn")} />
            </Field>

            <Field label="Variant">
              <Input placeholder="e.g. K30, For Injection" {...register("variant")} />
            </Field>

            <Field label="CAS number">
              <Input
                placeholder="e.g. 103-90-2"
                className="font-mono"
                {...register("cas")}
              />
              <p className="text-[11px] font-medium text-muted-foreground">
                Checksum-validated on save; an invalid number is kept verbatim
                but not used as the search key.
              </p>
            </Field>

            <Field label="Molecular formula">
              <Input
                placeholder="e.g. C8H9NO2"
                className="font-mono"
                {...register("molecular_formula")}
              />
            </Field>

            <Field label="Therapeutic class" className="sm:col-span-2">
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

            <Field label="Indication" className="sm:col-span-2">
              <Input
                placeholder="e.g. Analgesic, Antipyretic"
                {...register("indication_text")}
              />
            </Field>

            <Field label="Notes" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Anything worth recording about this substance"
                className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("notes")}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !detail}>
              {(isSubmitting || !detail) && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

/** Exported for `ProductCreateForm`, which shares this label+control layout. */
export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}


/**
 * The therapeutic axis as toggle chips.
 *
 * A multi-select `<select multiple>` is the obvious control and the wrong one:
 * it hides unselected options behind a scroll, and ctrl-clicking to deselect is
 * a well-known trap. With fifteen categories the whole set fits, so every
 * option is visible and one tap toggles it.
 */
/** Exported for `ProductCreateForm`, which needs the same chip picker. */
export function CategoryPicker({
  value,
  onChange,
  options,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  options: TherapeuticCategoryRef[];
}) {
  if (options.length === 0) {
    return (
      <p className="text-xs font-medium text-muted-foreground">
        No therapeutic categories are defined yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(
                selected
                  ? value.filter((id) => id !== option.id)
                  : [...value, option.id],
              )
            }
            className={
              selected
                ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                : "rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            }
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
