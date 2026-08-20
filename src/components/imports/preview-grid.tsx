"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CircleSlash,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  useCommitImport,
  useDeleteImportRow,
  useDiscardImport,
  useImportBatch,
  useImportFields,
  useImportRows,
  useImportSummary,
  useUndoImport,
  useUpdateImportRow,
} from "@/lib/queries";
import type {
  ImportField,
  ImportRow,
  ImportRowFilter,
  ImportStatus,
} from "@/types/api";

const PAGE_SIZE = 25;

/** Columns worth showing in the grid; the rest live in the row's detail panel. */
const GRID_FIELDS = ["company", "product", "cas", "category", "specification"];

const FILTERS: { key: ImportRowFilter | null; label: string }[] = [
  { key: null, label: "All rows" },
  { key: "errors", label: "Errors" },
  { key: "warnings", label: "Needs a look" },
  { key: "create", label: "New" },
  { key: "update", label: "Existing" },
];

/**
 * The shared preview grid (05-architecture C6). Every staged row, colour-coded
 * create / update / skip, with the errors and warnings that row carries and an
 * inline edit for fixing them. Nothing touches a business table until Commit.
 */
export function ImportPreviewGrid({ batchId }: { batchId: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ImportRowFilter | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const batch = useImportBatch(batchId);
  const summary = useImportSummary(batchId);
  const rows = useImportRows(batchId, { page, size: PAGE_SIZE, only: filter });
  const { data: fields } = useImportFields();

  const commit = useCommitImport(batchId);
  const undo = useUndoImport(batchId);
  const discard = useDiscardImport();

  const status: ImportStatus | undefined = batch.data?.status;
  const isCommitted = status === "committed";
  const isRolledBack = status === "rolled_back";
  const editable = !isCommitted && !isRolledBack;

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : fallback);
    }
  }

  if (batch.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading batch…
      </div>
    );
  }

  if (batch.isError || !batch.data) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="size-4" />
        That import batch could not be loaded.
      </p>
    );
  }

  const counts = summary.data;

  return (
    <div className="space-y-5">
      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {isCommitted && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            Committed — {batch.data.companies_created ?? 0} companies,{" "}
            {batch.data.products_created ?? 0} products and{" "}
            {batch.data.offers_created ?? 0} offers were created. Undo reverses
            it.
          </span>
        </p>
      )}

      {isRolledBack && (
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Undo2 className="mt-0.5 size-4 shrink-0" />
          <span>{batch.data.notes ?? "This batch was rolled back."}</span>
        </p>
      )}

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="Rows" value={counts.total} />
          <Tile label="New" value={counts.to_create} tone="create" />
          <Tile label="Existing" value={counts.to_update} tone="update" />
          <Tile
            label="Needs a look"
            value={counts.warnings}
            tone={counts.warnings ? "warn" : "neutral"}
          />
          <Tile
            label="Errors"
            value={counts.errors}
            tone={counts.errors ? "error" : "neutral"}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setFilter(option.key);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === option.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  run(async () => {
                    await discard.mutateAsync(batchId);
                    router.push("/imports");
                  }, "Could not discard this batch.")
                }
                disabled={discard.isPending}
              >
                <Trash2 />
                Discard
              </Button>
              <Button
                onClick={() =>
                  run(
                    () => commit.mutateAsync(true),
                    "Could not commit this batch.",
                  )
                }
                disabled={commit.isPending || (counts?.total ?? 0) === 0}
              >
                {commit.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Committing…
                  </>
                ) : (
                  <>
                    <Check />
                    Commit {counts?.valid ?? 0} rows
                  </>
                )}
              </Button>
            </>
          )}
          {isCommitted && (
            <Button
              variant="outline"
              onClick={() =>
                run(() => undo.mutateAsync(), "Could not undo this batch.")
              }
              disabled={undo.isPending}
            >
              {undo.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Undo2 />
              )}
              Undo this import
            </Button>
          )}
        </div>
      </div>

      {counts && counts.errors > 0 && editable && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {counts.errors} row{counts.errors === 1 ? "" : "s"} cannot be
            imported and will be skipped. Fix them here, or commit the other{" "}
            {counts.valid} and come back to these.
          </span>
        </p>
      )}

      <RowTable
        rows={rows.data?.items ?? []}
        loading={rows.isLoading}
        fields={fields ?? []}
        batchId={batchId}
        editable={editable}
      />

      {rows.data && rows.data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {rows.data.page} of {rows.data.pages} ·{" "}
            {rows.data.total.toLocaleString()} rows
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= rows.data.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowTable({
  rows,
  loading,
  fields,
  batchId,
  editable,
}: {
  rows: ImportRow[];
  loading: boolean;
  fields: ImportField[];
  batchId: number;
  editable: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading rows…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No rows match this filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Action</th>
            {GRID_FIELDS.map((key) => (
              <th key={key} className="px-3 py-2 text-left font-medium">
                {fields.find((field) => field.key === key)?.label ?? key}
              </th>
            ))}
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <RowLine
              key={row.id}
              row={row}
              fields={fields}
              batchId={batchId}
              editable={editable}
              editing={editing === row.id}
              onToggleEdit={() =>
                setEditing((current) => (current === row.id ? null : row.id))
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowLine({
  row,
  fields,
  batchId,
  editable,
  editing,
  onToggleEdit,
}: {
  row: ImportRow;
  fields: ImportField[];
  batchId: number;
  editable: boolean;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const errors = row.errors.filter((issue) => issue.severity === "error");
  const warnings = row.errors.filter((issue) => issue.severity === "warning");
  const flagged = new Set(
    row.errors.map((issue) => issue.column_name).filter(Boolean) as string[],
  );

  return (
    <>
      <tr className={errors.length ? "bg-destructive/5" : undefined}>
        <td className="px-3 py-2 text-xs text-muted-foreground">{row.row_no}</td>
        <td className="px-3 py-2">
          <ActionBadge action={row.action} valid={row.is_valid} />
        </td>
        {GRID_FIELDS.map((key) => (
          <td
            key={key}
            className={`max-w-[16rem] truncate px-3 py-2 ${
              flagged.has(key)
                ? "text-amber-700 underline decoration-amber-500/60 decoration-dotted underline-offset-2 dark:text-amber-400"
                : "text-foreground"
            }`}
            title={row.raw[key] ?? ""}
          >
            {row.raw[key] || (
              <span className="text-muted-foreground/50">—</span>
            )}
          </td>
        ))}
        <td className="px-3 py-2 text-right">
          {editable && (
            <button
              type="button"
              onClick={onToggleEdit}
              aria-label={editing ? "Close editor" : "Edit this row"}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {editing ? (
                <X className="size-4" />
              ) : (
                <PencilLine className="size-4" />
              )}
            </button>
          )}
        </td>
      </tr>

      {(errors.length > 0 || warnings.length > 0) && !editing && (
        <tr className={errors.length ? "bg-destructive/5" : undefined}>
          <td />
          <td colSpan={GRID_FIELDS.length + 2} className="px-3 pb-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[...errors, ...warnings].map((issue) => (
                <span
                  key={issue.code + (issue.column_name ?? "")}
                  className={`inline-flex items-center gap-1 text-[11px] ${
                    issue.severity === "error"
                      ? "text-destructive"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {issue.severity === "error" ? (
                    <AlertCircle className="size-3" />
                  ) : (
                    <AlertTriangle className="size-3" />
                  )}
                  {issue.message}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}

      {editing && (
        <tr>
          <td />
          <td colSpan={GRID_FIELDS.length + 2} className="px-3 py-3">
            <RowEditor
              row={row}
              fields={fields}
              batchId={batchId}
              onDone={onToggleEdit}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function RowEditor({
  row,
  fields,
  batchId,
  onDone,
}: {
  row: ImportRow;
  fields: ImportField[];
  batchId: number;
  onDone: () => void;
}) {
  const update = useUpdateImportRow(batchId);
  const remove = useDeleteImportRow(batchId);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [field.key, row.raw[field.key] ?? ""]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  // Only the fields this row actually carries, plus the ones it is missing and
  // needs — showing all 22 for a row with three populated cells is noise.
  const visible = fields.filter(
    (field) => field.required || row.raw[field.key] !== undefined,
  );

  async function save() {
    setError(null);
    try {
      const changed = Object.fromEntries(
        Object.entries(draft).filter(
          ([key, value]) => value !== (row.raw[key] ?? ""),
        ),
      );
      if (Object.keys(changed).length > 0) {
        await update.mutateAsync({ rowId: row.id, cells: changed });
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not save this row.",
      );
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      {error && (
        <p className="mb-2 text-xs text-destructive">{error}</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((field) => (
          <label key={field.key} className="block">
            <span className="text-[11px] font-medium text-muted-foreground">
              {field.label}
            </span>
            <input
              value={draft[field.key] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={async () => {
            await remove.mutateAsync(row.id);
            onDone();
          }}
          disabled={remove.isPending}
        >
          <Trash2 />
          Remove row
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? (
              <>
                <RefreshCw className="animate-spin" />
                Re-checking…
              </>
            ) : (
              <>
                <Check />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({
  action,
  valid,
}: {
  action: ImportRow["action"];
  valid: boolean | null;
}) {
  if (valid === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
        <CircleSlash className="size-3" />
        Skipped
      </span>
    );
  }
  if (action === "create") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        <Plus className="size-3" />
        New
      </span>
    );
  }
  if (action === "update") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-400">
        <RefreshCw className="size-3" />
        Existing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <CircleSlash className="size-3" />
      Skip
    </span>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "create" | "update" | "warn" | "error";
}) {
  const toneClass = {
    neutral: "text-foreground",
    create: "text-emerald-600 dark:text-emerald-500",
    update: "text-sky-600 dark:text-sky-400",
    warn: "text-amber-600 dark:text-amber-500",
    error: "text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-xl font-bold ${toneClass}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
