"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  Info,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import {
  useDeleteEmailTemplate,
  useEmailTemplateCatalog,
  useEmailTemplates,
  useSaveEmailTemplate,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { EmailTemplateInput, EmailTemplateKind } from "@/types/api";

/**
 * Create / edit one email template (2026-09-22, to the client's mockup).
 *
 * Three columns: the template type, the details (name, subject, placeholders,
 * message), and a live preview filled with sample data. Emails are sent as
 * plain text, so the editor's formatting buttons that would need HTML (bold,
 * links, alignment) are shown disabled; lists, variables and full screen work.
 * The real email is always filled in on the server, from the enquiry.
 */

const SAMPLE: Record<string, string> = {
  greeting: "Mr. Zhang",
  supplier_name: "Hangzhou Haixing Biotech",
  contact_name: "Mr. Zhang",
  reference: "INQ-0480",
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

/** The server's rendering rules, applied to sample data. */
function fill(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const rendered = raw.replace(PLACEHOLDER, (m, key: string) => SAMPLE[key.toLowerCase()] ?? m);
    const onlyPlaceholders = /\{\{/.test(raw) && raw.replace(PLACEHOLDER, "").trim() === "";
    if (onlyPlaceholders && rendered.trim() === "") continue;
    lines.push(rendered.trimEnd());
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const KIND_LABEL: Record<EmailTemplateKind, string> = { enquiry: "Enquiry", follow_up: "Follow-up" };

export function EmailTemplateEditor({
  templateId,
  newKind = "enquiry",
}: {
  /** null = a new template. */
  templateId: number | null;
  newKind?: EmailTemplateKind;
}) {
  const templates = useEmailTemplates();
  const catalog = useEmailTemplateCatalog();

  if (templates.isPending || catalog.isPending) {
    return (
      <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading template…
      </div>
    );
  }
  const existing = templateId === null ? null : templates.data?.find((t) => t.id === templateId);
  if (templateId !== null && !existing) {
    return (
      <div className="space-y-3 p-6">
        <Breadcrumb title="Edit template" />
        <p className="text-sm font-semibold text-destructive">That template does not exist any more.</p>
      </div>
    );
  }
  const starter = catalog.data?.starters.find((s) => s.kind === newKind);
  const initial: EmailTemplateInput = existing
    ? {
        name: existing.name,
        kind: existing.kind,
        subject: existing.subject,
        body: existing.body,
        is_default: existing.is_default,
      }
    : { name: "", kind: newKind, subject: starter?.subject ?? "", body: starter?.body ?? "", is_default: false };

  return (
    <Form
      key={templateId ?? `new-${newKind}`}
      templateId={templateId}
      initial={initial}
      placeholders={catalog.data?.placeholders ?? []}
      existingNames={(templates.data ?? []).map((t) => t.name.toLowerCase())}
    />
  );
}

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link href="/email/templates" className="inline-flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Email templates
      </Link>
      <ChevronRight className="size-4 text-muted-foreground" />
      <span className="font-medium text-foreground">{title}</span>
    </nav>
  );
}

function Form({
  templateId,
  initial,
  placeholders,
  existingNames,
}: {
  templateId: number | null;
  initial: EmailTemplateInput;
  placeholders: { name: string; description: string }[];
  existingNames: string[];
}) {
  const router = useRouter();
  const save = useSaveEmailTemplate();
  const remove = useDeleteEmailTemplate();
  const [form, setForm] = useState<EmailTemplateInput>(initial);
  const [target, setTarget] = useState<"subject" | "body">("body");
  const [fullscreen, setFullscreen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const editing = templateId !== null;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const valid = form.name.trim() !== "" && form.subject.trim() !== "" && form.body.trim() !== "";
  const set = (patch: Partial<EmailTemplateInput>) => setForm((f) => ({ ...f, ...patch }));

  const words = useMemo(() => (form.body.trim() ? form.body.trim().split(/\s+/).length : 0), [form.body]);

  function insertAtCursor(token: string, into: "subject" | "body" = target) {
    const field = into === "subject" ? subjectRef.current : bodyRef.current;
    const value = form[into];
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    set({ [into]: value.slice(0, start) + token + value.slice(end) } as Partial<EmailTemplateInput>);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  /** Prefix the selected lines of the message — the plain-text list forms
   *  the built-in email itself uses. */
  function prefixLines(kind: "bullet" | "number") {
    const field = bodyRef.current;
    if (!field) return;
    const value = form.body;
    const from = value.lastIndexOf("\n", field.selectionStart - 1) + 1;
    const toIndex = value.indexOf("\n", field.selectionEnd);
    const to = toIndex === -1 ? value.length : toIndex;
    const block = value
      .slice(from, to)
      .split("\n")
      .map((line, i) => (line.trim() ? (kind === "bullet" ? `  - ${line.trim()}` : `${i + 1}. ${line.trim()}`) : line))
      .join("\n");
    set({ body: value.slice(0, from) + block + value.slice(to) });
    requestAnimationFrame(() => field.focus());
  }

  function persist(asNew: boolean) {
    let name = form.name.trim();
    if (asNew && existingNames.includes(name.toLowerCase())) name = `${name} (copy)`;
    save.mutate(
      { id: asNew ? null : templateId, payload: { ...form, name } },
      {
        onSuccess: (saved) => {
          toast.success(asNew || !editing ? "Template created" : "Template updated");
          if (asNew || !editing) router.replace(`/email/templates/${saved.id}`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save the template"),
      },
    );
  }

  const disabledHint = "Emails are sent as plain text, so this formatting would not reach the supplier.";
  const visibleChips = showAll ? placeholders : placeholders.slice(0, 13);

  return (
    <div className="space-y-5">
      <Breadcrumb title={editing ? "Edit template" : "New template"} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-9">
            {editing ? "Edit Email Template" : "New Email Template"}
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Create and customize email templates for your supplier communications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-11 px-4" onClick={() => setPreviewOpen(true)}>
            <Eye />
            Preview
          </Button>
          {editing && (
            <Button variant="outline" className="h-11 px-4" onClick={() => persist(true)} disabled={!valid || save.isPending}>
              <Copy />
              Save as new
            </Button>
          )}
          <Button className="h-11 px-5" onClick={() => persist(false)} disabled={!valid || save.isPending || (editing && !dirty)}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            {editing ? "Update template" : "Create template"}
          </Button>
          {editing && (
            <DropdownMenu
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label="More actions"
                  className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm hover:bg-accent"
                >
                  <MoreVertical className="size-4" />
                </button>
              )}
            >
              {(close) => (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      persist(true);
                    }}
                  >
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      setConfirming(true);
                    }}
                  >
                    <Trash2 />
                    Delete template
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* Details + message */}
        <section className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
          <div className="space-y-4 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">Template details</h2>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-foreground">
                  Template name <span className="text-destructive">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Standard enquiry 1"
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <span className="block text-xs text-muted-foreground">Give a clear name to identify this template.</span>
              </label>
              <div className="space-y-1.5">
                <span className="text-[13px] font-medium text-foreground">Used for</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["enquiry", "follow_up"] as EmailTemplateKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => set({ kind })}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-colors",
                        form.kind === kind
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/40"
                          : "border-input text-foreground hover:bg-accent/40",
                      )}
                    >
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-foreground">
                Subject <span className="text-destructive">*</span>
              </span>
              <input
                ref={subjectRef}
                value={form.subject}
                onFocus={() => setTarget("subject")}
                onChange={(e) => set({ subject: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <span className="block text-xs text-muted-foreground">Subject line for the email. You can use placeholders.</span>
            </label>
          </div>

          <div className="space-y-3 border-t border-border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                  Placeholders
                  <Info className="size-3.5 text-primary" aria-label="Filled in from the enquiry when the email is written" />
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  Click on a placeholder to insert it into the {target === "subject" ? "subject" : "message"}.
                </p>
              </div>
              {placeholders.length > 13 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                  {showAll ? "Show fewer" : "View all variables"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleChips.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.description}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertAtCursor(`{{${p.name}}}`)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground/80 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {`{{${p.name}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border p-4 sm:p-5">
            <h3 className="text-base font-semibold text-foreground">Email message</h3>
            <MessageEditor
              value={form.body}
              onChange={(body) => set({ body })}
              onFocus={() => setTarget("body")}
              textareaRef={bodyRef}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              onList={prefixLines}
              onInsertVariable={(name) => insertAtCursor(`{{${name}}}`, "body")}
              placeholders={placeholders}
              words={words}
              disabledHint={disabledHint}
            />
            <label className="flex items-start gap-2.5 pt-2">
              <Checkbox checked={form.is_default} onChange={() => set({ is_default: !form.is_default })} className="mt-0.5" />
              <span>
                <span className="block text-sm text-foreground">
                  Pre-select this template when sending {form.kind === "enquiry" ? "an enquiry" : "a follow-up"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  This template will be selected by default in the Send {form.kind === "enquiry" ? "Enquiry" : "Follow-up"} dialog.
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* Live preview */}
        <section className="h-fit min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Live preview</h2>
            <p className="text-[13px] text-muted-foreground">Sample data is used to show how the email will look.</p>
          </div>
          <PreviewPanel subject={form.subject} body={form.body} />
          <div className="flex gap-3 rounded-xl border border-tile-blue/20 bg-tile-blue-bg/60 p-4">
            <Lightbulb className="size-5 shrink-0 text-tile-blue" />
            <div>
              <p className="text-sm font-semibold text-tile-blue">Tip</p>
              <p className="text-[13px] text-tile-blue/90">
                The preview shows how your email will look with sample data. Actual values will be replaced when you send
                the email.
              </p>
            </div>
          </div>
        </section>
      </div>

      {previewOpen && <PreviewDialog subject={form.subject} body={form.body} onClose={() => setPreviewOpen(false)} />}

      {confirming && templateId !== null && (
        <ConfirmDialog
          title={`Delete "${initial.name}"?`}
          description="It disappears from the Send dialogs. Emails already sent with it are not affected."
          confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
          busy={remove.isPending}
          onConfirm={() =>
            remove.mutate(templateId, {
              onSuccess: () => {
                toast.success("Template deleted");
                router.push("/email/templates");
              },
              onError: (err) => {
                toast.error(err instanceof ApiError ? err.message : "Could not delete it");
                setConfirming(false);
              },
            })
          }
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

// --- The message editor ------------------------------------------------------------

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-foreground/80 hover:bg-accent enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MessageEditor({
  value,
  onChange,
  onFocus,
  textareaRef,
  fullscreen,
  onToggleFullscreen,
  onList,
  onInsertVariable,
  placeholders,
  words,
  disabledHint,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onList: (kind: "bullet" | "number") => void;
  onInsertVariable: (name: string) => void;
  placeholders: { name: string; description: string }[];
  words: number;
  disabledHint: string;
}) {
  const editor = (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-input bg-card",
        fullscreen && "h-full",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <span
          title={disabledHint}
          className="mr-1 inline-flex h-7 cursor-not-allowed items-center gap-6 rounded-md px-2 text-[13px] text-foreground/50"
        >
          Paragraph
          <ChevronDown className="size-3.5" />
        </span>
        <ToolButton label={`Bold — ${disabledHint}`} disabled>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton label={`Italic — ${disabledHint}`} disabled>
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton label={`Underline — ${disabledHint}`} disabled>
          <Underline className="size-4" />
        </ToolButton>
        <ToolButton label={`Link — ${disabledHint}`} disabled>
          <Link2 className="size-4" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolButton label="Bulleted list" onClick={() => onList("bullet")}>
          <List className="size-4" />
        </ToolButton>
        <ToolButton label="Numbered list" onClick={() => onList("number")}>
          <ListOrdered className="size-4" />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolButton label={`Align left — ${disabledHint}`} disabled>
          <AlignLeft className="size-4" />
        </ToolButton>
        <ToolButton label={`Align center — ${disabledHint}`} disabled>
          <AlignCenter className="size-4" />
        </ToolButton>
        <ToolButton label={`Align right — ${disabledHint}`} disabled>
          <AlignRight className="size-4" />
        </ToolButton>
        <span className="ml-auto flex items-center gap-1">
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                onMouseDown={(e) => e.preventDefault()}
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground/85 hover:bg-accent"
              >
                <Braces className="size-3.5" />
                Insert variable
              </button>
            )}
          >
            {(close) => (
              <>
                {placeholders.map((p) => (
                  <DropdownMenuItem
                    key={p.name}
                    onClick={() => {
                      close();
                      onInsertVariable(p.name);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs">{`{{${p.name}}}`}</span>
                      <span className="block max-w-64 truncate text-[11px] text-muted-foreground">{p.description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenu>
          <ToolButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={onToggleFullscreen}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </ToolButton>
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        spellCheck
        className={cn(
          "w-full resize-y bg-transparent px-3 py-2.5 text-[13px] leading-[1.7] text-foreground outline-none",
          fullscreen ? "min-h-0 flex-1 resize-none" : "min-h-[15rem]",
        )}
      />
      <div className="flex justify-end gap-4 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>Words: {words}</span>
        <span>Characters: {value.length}</span>
      </div>
    </div>
  );

  if (!fullscreen || typeof document === "undefined") return editor;
  return createPortal(
    <div className="fixed inset-0 z-[210] bg-foreground/60 p-4 backdrop-blur-md sm:p-8">{editor}</div>,
    document.body,
  );
}

// --- Preview -------------------------------------------------------------------------

/** The filled-in email, styled: "1." blocks become a numbered list with their
 *  indented detail lines, and "  - " lines become bullets. */
function RenderedEmail({ body }: { body: string }) {
  const blocks = fill(body).split(/\n{2,}/);
  return (
    <div className="space-y-4 text-sm leading-6 text-foreground">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        if (/^\d+\.\s/.test(lines[0])) {
          const [, heading] = lines[0].match(/^\d+\.\s+(.*)$/) ?? [];
          return (
            <ol key={index} start={Number(lines[0].split(".")[0])} className="list-decimal space-y-0 pl-6">
              <li>
                {heading}
                {lines.slice(1).map((line, i) => (
                  <span key={i} className="block">
                    {line.trim()}
                  </span>
                ))}
              </li>
            </ol>
          );
        }
        const bullets = lines.filter((line) => /^\s*-\s/.test(line));
        if (bullets.length > 0) {
          const lead = lines.filter((line) => !/^\s*-\s/.test(line));
          return (
            <div key={index}>
              {lead.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <ul className="list-disc pl-6">
                {bullets.map((line, i) => (
                  <li key={i}>{line.replace(/^\s*-\s/, "")}</li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap break-words">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function PreviewPanel({ subject, body }: { subject: string; body: string }) {
  const [tab, setTab] = useState<"preview" | "raw">("preview");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-xl bg-secondary/60 p-1">
        {(
          [
            ["preview", "Email preview"],
            ["raw", "Raw content"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "h-9 rounded-lg text-sm font-medium transition-colors",
              tab === key ? "border border-border bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <dl className="space-y-2 border-b border-border bg-secondary/30 px-4 py-3 text-xs">
          <div className="flex gap-4">
            <dt className="w-12 shrink-0 text-muted-foreground">To</dt>
            <dd className="text-foreground/85">supplier@example.com</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-12 shrink-0 text-muted-foreground">Subject</dt>
            <dd className="min-w-0 break-words font-semibold text-foreground">{fill(subject) || "—"}</dd>
          </div>
        </dl>
        <div className="max-h-[36rem] overflow-y-auto px-4 py-4">
          {tab === "preview" ? (
            <RenderedEmail body={body} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">{fill(body)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewDialog({ subject, body, onClose }: { subject: string; body: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Email preview" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Eye className="size-5 text-primary" />
          <h2 className="flex-1 text-base font-bold text-foreground">Email preview</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <PreviewPanel subject={subject} body={body} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
