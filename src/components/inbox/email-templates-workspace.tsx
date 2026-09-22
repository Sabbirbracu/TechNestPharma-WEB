"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LayoutTemplate, Loader2, Lock, Pencil, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailTemplateCatalog, useEmailTemplates } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { EmailTemplateKind } from "@/types/api";

/**
 * Email → Templates (2026-09-22).
 *
 * The buyer's own wordings for enquiry and follow-up emails, picked from a
 * dropdown in the Send / New Enquiry dialogs. `{{placeholders}}` are filled in
 * on the server from the enquiry — the same facts the built-in email uses — so
 * what a dialog previews is exactly what is sent. The built-in "Standard"
 * emails are shown read-only and can be duplicated as a starting point.
 */

const KIND_LABEL: Record<EmailTemplateKind, string> = {
  enquiry: "Enquiry",
  follow_up: "Follow-up",
};

// Example values for the live preview only; the real email is always
// filled in on the server.
const SAMPLE: Record<string, string> = {
  greeting: "Li Wei",
  supplier_name: "Hangzhou Haixing Biotech",
  contact_name: "Li Wei",
  reference: "ENQ-0480",
  product_count: "2 products",
  product_names: "Paracetamol, Amoxicillin Trihydrate",
  product_list:
    "1. Paracetamol (CAS 103-90-2)\n   Quantity: 500 kg\n   Specification: USP\n\n2. Amoxicillin Trihydrate (CAS 61336-70-7)\n   Quantity: 200 kg",
  terms_list:
    "  - Unit price, with the currency and the unit it applies to\n  - Minimum order quantity\n  - Lead time",
  documents: "COA, GMP certificate",
  documents_line: "Please also attach: COA, GMP certificate.",
  notes: "",
  tender_refs: "IMP/RM/SEM/18/2026-2027",
  our_company: "TechNest Pharma",
};

const PLACEHOLDER = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

/** The server's rendering rules, for the preview: fill in, drop lines that
 *  were only empty placeholders, collapse blank runs. */
function preview(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const rendered = raw.replace(PLACEHOLDER, (m, key: string) => SAMPLE[key.toLowerCase()] ?? m);
    const onlyPlaceholders = /\{\{/.test(raw) && raw.replace(PLACEHOLDER, "").trim() === "";
    if (onlyPlaceholders && rendered.trim() === "") continue;
    lines.push(rendered.trimEnd());
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function EmailTemplatesWorkspace() {
  const router = useRouter();
  const templates = useEmailTemplates();
  const catalog = useEmailTemplateCatalog();
  const [builtin, setBuiltin] = useState<EmailTemplateKind>("enquiry");
  const list = templates.data ?? [];
  const starter = catalog.data?.starters.find((s) => s.kind === builtin);
  const startNew = (kind: EmailTemplateKind) => router.push(`/email/templates/new?kind=${kind}`);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <LayoutTemplate className="size-6 text-primary" />
            Email templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Your own wordings for enquiry and follow-up emails. Pick one in the Send Enquiry dialog — the
            placeholders are filled in from the enquiry.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => startNew("follow_up")}>
            <Plus />
            New follow-up
          </Button>
          <Button onClick={() => startNew("enquiry")}>
            <Plus />
            New enquiry template
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {(["enquiry", "follow_up"] as EmailTemplateKind[]).map((kind) => {
            const saved = list.filter((t) => t.kind === kind);
            return (
              <section key={kind} className="border-b border-border last:border-b-0">
                <h2 className="px-4 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {KIND_LABEL[kind]} emails
                </h2>
                <ul className="pb-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => setBuiltin(kind)}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent/40",
                        builtin === kind && "bg-primary/5 font-semibold text-primary",
                      )}
                    >
                      <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">Standard {KIND_LABEL[kind].toLowerCase()}</span>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Built-in</span>
                    </button>
                  </li>
                  {saved.map((template) => (
                    <li key={template.id}>
                      <Link
                        href={`/email/templates/${template.id}`}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent/40"
                      >
                        <LayoutTemplate className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{template.name}</span>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-tile-amber-bg px-1.5 py-px text-[10px] font-bold text-tile-amber">
                            <Star className="size-2.5 fill-current" />
                            Default
                          </span>
                        )}
                        <Pencil className="size-3 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                  {saved.length === 0 && (
                    <li className="px-4 py-1.5 text-xs text-muted-foreground">
                      No saved {KIND_LABEL[kind].toLowerCase()} templates yet.
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
          {templates.isPending && (
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </p>
          )}
        </aside>

        <BuiltinView
          kind={builtin}
          subject={starter?.subject ?? ""}
          body={starter?.body ?? ""}
          onDuplicate={() => startNew(builtin)}
        />
      </div>
    </div>
  );
}

function BuiltinView({
  kind,
  subject,
  body,
  onDuplicate,
}: {
  kind: EmailTemplateKind;
  subject: string;
  body: string;
  onDuplicate: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Standard {KIND_LABEL[kind].toLowerCase()}</h2>
          <p className="text-sm text-muted-foreground">
            The built-in email. It can&rsquo;t be edited — start a new template from it to make your own version.
          </p>
        </div>
        <Button variant="outline" onClick={onDuplicate}>
          <Copy />
          Duplicate to edit
        </Button>
      </div>
      <PreviewBox subject={subject} body={body} />
    </section>
  );
}

function PreviewBox({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <p className="border-b border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Preview with sample data
      </p>
      <div className="space-y-2 px-4 py-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Subject: </span>
          <span className="font-semibold text-foreground">{preview(subject) || "(built-in subject)"}</span>
        </p>
        <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground/90">{preview(body)}</pre>
      </div>
    </div>
  );
}
