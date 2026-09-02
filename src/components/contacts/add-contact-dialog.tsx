"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Plus, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyPicker } from "@/components/companies/company-picker";
import { useCreateContact } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { CompanyListItem } from "@/types/api";

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "mobile", label: "Mobile" },
  { value: "fax", label: "Fax" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "wechat", label: "WeChat" },
  { value: "skype", label: "Skype" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

const formSchema = z.object({
  name_en: z.string().min(1, "Name is required"),
  designation: z.string(),
  department: z.string(),
  is_primary: z.boolean(),
  channels: z.array(
    z.object({
      channel: z.enum(CHANNEL_OPTIONS.map((o) => o.value) as [string, ...string[]]),
      value: z.string().min(1, "Required"),
    }),
  ),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  name_en: "",
  designation: "",
  department: "",
  is_primary: false,
  channels: [{ channel: "email", value: "" }],
};

/**
 * Standalone "Add Contact" (FR-CON) — reachable from the Contacts page
 * itself, where (unlike the company detail page's own contact editor) no
 * company is already fixed, so this leads with the same search-and-pick or
 * add-new-company pattern the product create form uses.
 */
export function AddContactDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [company, setCompany] = useState<CompanyListItem | null>(null);
  const createContact = useCreateContact(company?.id ?? 0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY });
  const { fields, append, remove } = useFieldArray({ control, name: "channels" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(EMPTY);
      setCompany(null);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    if (!company) {
      setError("root", { message: "Pick which company this person works for." });
      return;
    }
    try {
      await createContact.mutateAsync({
        company_id: company.id,
        name_en: values.name_en,
        designation: values.designation || null,
        department: values.department || null,
        is_primary: values.is_primary,
        channels: values.channels
          .filter((channel) => channel.value.trim())
          .map((channel) => ({
            channel: channel.channel as (typeof CHANNEL_OPTIONS)[number]["value"],
            value: channel.value,
          })),
      });
      onClose();
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : "Could not save this contact. Is the API running?",
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
      aria-labelledby="add-contact-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="add-contact-title" className="text-base font-bold text-foreground">
              Add Contact
            </h2>
            <p className="text-xs text-muted-foreground">
              A person at a supplier or manufacturer, and how to reach them
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Company *
            </label>
            <CompanyPicker value={company} onChange={setCompany} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Name *
              </label>
              <Input autoFocus placeholder="Full name" {...register("name_en")} />
              {errors.name_en && (
                <p className="text-xs font-medium text-destructive">{errors.name_en.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Designation
              </label>
              <Input placeholder="e.g. Sales Manager" {...register("designation")} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Department
              </label>
              <Input placeholder="e.g. International Sales" {...register("department")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...register("is_primary")}
            />
            Primary contact for this company
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Contact channels
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ channel: "email", value: "" })}
              >
                <Plus className="size-3.5" />
                Add channel
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <select
                    className="h-10 w-32 shrink-0 rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    {...register(`channels.${index}.channel` as const)}
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <Input placeholder="Value" {...register(`channels.${index}.value` as const)} />
                    {errors.channels?.[index]?.value && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        {errors.channels[index]?.value?.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove channel"
                    className="mt-1 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Add contact
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
