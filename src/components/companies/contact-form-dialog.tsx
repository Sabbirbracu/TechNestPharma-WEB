"use client";

import { useEffect, useRef } from "react";
import {
  useForm,
  useFieldArray,
  useFormContext,
  useWatch,
  FormProvider,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  UserRound,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateContact, useUpdateContact } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { ChannelType, CompanyContact } from "@/types/api";

/** qr_image is a photo, not a typed value — no free-text field fits it, so it
 *  is excluded from manual entry here (import-only). */
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

const channelSchema = z.object({
  channel: z.enum(CHANNEL_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  value: z.string().min(1, "Required"),
});

const personSchema = z.object({
  // Present for a person already on file; absent for one added in this
  // session — that's what tells submit whether to PATCH or POST.
  id: z.number().optional(),
  name_en: z.string().min(1, "Name is required"),
  name_cn: z.string(),
  designation: z.string(),
  department: z.string(),
  is_primary: z.boolean(),
  channels: z.array(channelSchema),
});

const formSchema = z.object({
  people: z.array(personSchema).min(1, "Add at least one contact"),
});

type FormValues = z.infer<typeof formSchema>;
type PersonValues = FormValues["people"][number];

const blankPerson: PersonValues = {
  name_en: "",
  name_cn: "",
  designation: "",
  department: "",
  is_primary: false,
  channels: [],
};

function valuesFromContacts(contacts: CompanyContact[]): FormValues {
  if (contacts.length === 0) return { people: [blankPerson] };
  return {
    people: contacts.map((c) => ({
      id: c.id,
      name_en: c.name_en,
      name_cn: c.name_cn ?? "",
      designation: c.designation ?? "",
      department: c.department ?? "",
      is_primary: c.is_primary,
      channels: c.channels.map((ch) => ({ channel: ch.channel, value: ch.value })),
    })),
  };
}

/**
 * Single modal for a company's entire contact roster (FR-CON) — editing
 * people already on file and adding new ones both happen here, in one form,
 * rather than a separate "add contact" flow living outside the editor. Every
 * person shown submits together: existing ones (carrying an `id`) are
 * PATCHed, new blocks (no `id`) are POSTed, in parallel.
 */
export function ContactFormDialog({
  open,
  onClose,
  companyId,
  contacts,
}: {
  open: boolean;
  onClose: () => void;
  companyId: number;
  contacts: CompanyContact[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createContact = useCreateContact(companyId);
  const updateContact = useUpdateContact(companyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { people: [blankPerson] },
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "people" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset(valuesFromContacts(contacts));
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // `contacts` deliberately excluded: only the *opening* transition should
    // reseed the form from it, so a background refetch mid-edit can't blow
    // away in-progress typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await Promise.all(
        values.people.map((person) => {
          const shared = {
            name_en: person.name_en,
            name_cn: person.name_cn || null,
            designation: person.designation || null,
            department: person.department || null,
            is_primary: person.is_primary,
            channels: person.channels.map((c) => ({
              channel: c.channel as ChannelType,
              value: c.value,
            })),
          };
          return person.id
            ? updateContact.mutateAsync({ id: person.id, ...shared })
            : createContact.mutateAsync({ company_id: companyId, ...shared });
        }),
      );
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save these contacts. Is the API running?";
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
      aria-labelledby="contact-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="contact-dialog-title" className="text-base font-bold text-foreground">
              Manage Contacts
            </h2>
            <p className="text-xs text-muted-foreground">
              Edit anyone on file, or add a new contact below
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

        <FormProvider {...form}>
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

            <div className="space-y-4">
              {fields.map((field, index) => (
                <PersonBlock
                  key={field.id}
                  control={control}
                  index={index}
                  isOnly={fields.length === 1}
                  onRemove={() => remove(index)}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={() => append(blankPerson)}
            >
              <UserPlus className="size-4" />
              Add another contact person
            </Button>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? "Saving..." : "Save all"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </dialog>
  );
}

function PersonBlock({
  control,
  index,
  isOnly,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  isOnly: boolean;
  onRemove: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `people.${index}.channels`,
  });
  const personErrors = errors.people?.[index];
  // `fields[i].id` above is react-hook-form's own synthetic key — always
  // present, useless for this. The real database id (present only for a
  // person already on file) has to be read from form *values*, not the
  // fields array, since it's never bound to a visible input.
  const savedId = useWatch({ control, name: `people.${index}.id` });
  const isSaved = Boolean(savedId);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {isSaved ? "On file" : "New contact"}
        </span>
        {/* Removing a saved person is a delete, out of scope here — only
            unsaved blocks added in this session can be discarded. */}
        {!isOnly && !isSaved && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove this contact"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Name *
          </label>
          <Input placeholder="Full name" {...register(`people.${index}.name_en` as const)} />
          {personErrors?.name_en && (
            <p className="text-xs font-medium text-destructive">{personErrors.name_en.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Chinese name
          </label>
          <Input
            placeholder="中文名 (optional)"
            {...register(`people.${index}.name_cn` as const)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Designation
          </label>
          <Input
            placeholder="e.g. Sales Manager"
            {...register(`people.${index}.designation` as const)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Department
          </label>
          <Input
            placeholder="e.g. Export Sales"
            {...register(`people.${index}.department` as const)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="size-4 rounded border-input accent-primary"
          {...register(`people.${index}.is_primary` as const)}
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

        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No channels yet — add an email, phone, WhatsApp, etc.
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field, channelIndex) => (
            <div key={field.id} className="flex items-start gap-2">
              <select
                className="h-10 w-32 shrink-0 rounded-xl border border-input bg-card px-3 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                {...register(`people.${index}.channels.${channelIndex}.channel` as const)}
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="flex-1">
                <Input
                  placeholder="Value"
                  {...register(`people.${index}.channels.${channelIndex}.value` as const)}
                />
                {personErrors?.channels?.[channelIndex]?.value && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {personErrors.channels[channelIndex]?.value?.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(channelIndex)}
                aria-label="Remove channel"
                className="mt-1 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
