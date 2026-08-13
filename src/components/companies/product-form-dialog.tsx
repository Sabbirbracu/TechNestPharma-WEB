"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateOffer,
  useCreateProduct,
  useUpdateOffer,
  useUpdateProduct,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { OfferListItem } from "@/types/api";

const MATERIAL_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "api", label: "API" },
  { value: "intermediate", label: "Intermediate" },
  { value: "excipient", label: "Excipient" },
  { value: "packaging_material", label: "Packaging Material" },
  { value: "finished_product", label: "Finished Product" },
  { value: "semi_finished_product", label: "Semi-finished Product" },
  { value: "vitamin", label: "Vitamin" },
  { value: "amino_acid", label: "Amino Acid" },
  { value: "plant_extract", label: "Plant Extract" },
  { value: "food_additive", label: "Food Additive" },
  { value: "solvent", label: "Solvent" },
  { value: "enzyme", label: "Enzyme" },
  { value: "cosmetic_ingredient", label: "Cosmetic Ingredient" },
  { value: "other", label: "Other" },
] as const;

const formSchema = z.object({
  name_en: z.string().min(1, "Name is required"),
  name_cn: z.string(),
  cas: z.string(),
  indication_text: z.string(),
  material_type: z.string(),
  spec_text: z.string(),
  qualification_text: z.string(),
  packing_text: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const blankValues: FormValues = {
  name_en: "",
  name_cn: "",
  cas: "",
  indication_text: "",
  material_type: "",
  spec_text: "",
  qualification_text: "",
  packing_text: "",
};

function valuesFromOffer(offer: OfferListItem): FormValues {
  return {
    name_en: offer.product?.name_en ?? "",
    name_cn: "", // not carried on the offers list shape; edit adds it fresh if needed
    cas: offer.product?.cas_number ?? "",
    indication_text: offer.product?.indication_text ?? "",
    material_type: offer.material_type ?? "",
    spec_text: offer.spec_text ?? "",
    qualification_text: offer.qualification_text ?? "",
    packing_text: offer.packing_text ?? "",
  };
}

/**
 * Add or edit a product this company supplies (FR-PROD, FR-OFFER). A row in
 * the "Product Catalogue" table is an *offer* — a product linked to this
 * company with its own spec — so saving here touches both: the product's own
 * fields (name, CAS, indication — global, shared by every company that
 * supplies it) and this company's offer fields (material type, spec).
 * Passing `offer` switches to edit mode; omitting it creates both a new
 * product and the offer linking it to this company.
 */
export function ProductFormDialog({
  open,
  onClose,
  companyId,
  offer,
}: {
  open: boolean;
  onClose: () => void;
  companyId: number;
  offer?: OfferListItem | null;
}) {
  const isEdit = Boolean(offer);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createOffer = useCreateOffer(companyId);
  const updateOffer = useUpdateOffer(companyId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(offer ? valuesFromOffer(offer) : blankValues);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed only on the open transition
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const productFields = {
        name_en: values.name_en,
        name_cn: values.name_cn || null,
        cas: values.cas || null,
        indication_text: values.indication_text || null,
      };
      const offerFields = {
        material_type:
          (values.material_type || null) as OfferListItem["material_type"],
        spec_text: values.spec_text || null,
        qualification_text: values.qualification_text || null,
        packing_text: values.packing_text || null,
      };

      if (isEdit && offer) {
        if (!offer.product) {
          setError("root", { message: "This offer has no linked product to edit." });
          return;
        }
        await Promise.all([
          updateProduct.mutateAsync({ id: offer.product.id, ...productFields }),
          updateOffer.mutateAsync({ id: offer.id, ...offerFields }),
        ]);
      } else {
        const { product } = await createProduct.mutateAsync(productFields);
        await createOffer.mutateAsync({
          company_id: companyId,
          product_id: product.id,
          ...offerFields,
        });
      }
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
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="product-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="product-dialog-title" className="text-base font-bold text-foreground">
              {isEdit ? "Edit Product" : "Add Product"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Product fields are global — shared by every company supplying it"
                : "Creates a new product and links it to this company"}
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
                Product name *
              </label>
              <Input autoFocus placeholder="e.g. Dexamethasone" {...register("name_en")} />
              {errors.name_en && (
                <p className="text-xs font-medium text-destructive">{errors.name_en.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Chinese name
              </label>
              <Input placeholder="中文名 (optional)" {...register("name_cn")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                CAS number
              </label>
              <Input placeholder="e.g. 50-02-2" {...register("cas")} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Indication / Use
              </label>
              <Input placeholder="What it's used for" {...register("indication_text")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Material type
              </label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register("material_type")}
              >
                {MATERIAL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Specification
              </label>
              <Input placeholder="This supplier's spec" {...register("spec_text")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Qualification / Approval
              </label>
              <Input
                placeholder="e.g. WHO-GMP, CEP, DMF"
                {...register("qualification_text")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Packing / Details
              </label>
              <Input placeholder="e.g. 25kg drum" {...register("packing_text")} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
