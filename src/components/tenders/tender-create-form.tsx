"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AUTHORITY_TYPE_OPTIONS } from "./tender-status";
import { useCreateTender } from "@/lib/queries";
import type { TenderAuthorityType } from "@/types/api";

/** Inline create. Only a name is required — the reference number and buyer
 *  usually get filled in from the notice afterwards, and demanding them up
 *  front would stand between the buyer and the shortlist they came to build. */
export function NewTenderForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [buyer, setBuyer] = useState("");
  const [authorityType, setAuthorityType] = useState<TenderAuthorityType | "">("");
  const [closing, setClosing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createTender = useCreateTender();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      const tender = await createTender.mutateAsync({
        name: name.trim(),
        reference_no: reference.trim() || null,
        buyer_name: buyer.trim() || null,
        authority_type: authorityType || null,
        closing_date: closing || null,
      });
      onCreated(tender.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the tender",
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">New tender</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Tender name" required>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="DGDA API Tender 2026"
          />
        </Field>
        <Field label="Reference no.">
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="DGDA/API/2026/07"
          />
        </Field>
        <Field label="Buying authority">
          <Input
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            placeholder="Directorate General…"
          />
        </Field>
        <Field label="Authority type">
          <Select
            value={authorityType}
            onChange={(event) =>
              setAuthorityType(event.target.value as TenderAuthorityType | "")
            }
          >
            <option value="">Unspecified</option>
            {AUTHORITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Closing date">
          <Input
            type="date"
            value={closing}
            onChange={(event) => setClosing(event.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || createTender.isPending}>
          {createTender.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Create tender
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
