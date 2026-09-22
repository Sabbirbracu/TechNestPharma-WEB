"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAGE_SIZES, ResultsPagination } from "@/components/search/results-pagination";
import { useActivityLog } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ActivityAction, AuditLogEntry } from "@/types/api";

const ACTION_OPTIONS: ActivityAction[] = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "upload",
  "download",
  "export",
  "import",
];

/** Every entity type any service currently writes to `activity_log` — kept
 *  here rather than fetched, since it's a fixed, small vocabulary baked into
 *  the backend's own `entity_type` strings. */
const ENTITY_TYPE_OPTIONS = [
  "app_user",
  "company",
  "contact_person",
  "product",
  "offer",
  "tender",
  "tender_item",
  "sourcing_request",
  "quotation",
  "communication",
  "sample_request",
  "document",
  "import_batch",
];

const ACTION_DOT: Partial<Record<ActivityAction, string>> = {
  create: "bg-tile-green",
  delete: "bg-destructive",
  update: "bg-tile-blue",
  login: "bg-success",
  logout: "bg-muted-foreground",
  upload: "bg-tile-purple",
  import: "bg-tile-purple",
  export: "bg-tile-amber",
  download: "bg-tile-amber",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `changes` is a raw JSON blob whose shape depends on which service wrote
 *  it — rendered as plain "key: value" pairs rather than a sentence, since
 *  there are too many entity types to hand-write one for each (see
 *  `services/activity_feed.py:list_log`). */
function formatChanges(changes: Record<string, unknown> | null): string {
  if (!changes || Object.keys(changes).length === 0) return "—";
  return Object.entries(changes)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}

export function ActivityLogWorkspace() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState<ActivityAction | "">("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[1]);

  const { data, isFetching, error } = useActivityLog({
    entity_type: entityType || undefined,
    action: action || undefined,
    since: since || undefined,
    until: until || undefined,
    page,
    size: pageSize,
    sort: "occurred_at",
    order: "desc",
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function resetFilterAndPage<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Activity Logs
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Who did what, and when — the full audit trail.
        </p>
      </div>

      {/* Phone: a two-column grid — the two pickers, then From / To. */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:p-4">
        <div className="min-w-0 sm:w-48">
          <Select
            value={entityType}
            onChange={(event) => resetFilterAndPage(setEntityType, event.target.value)}
            aria-label="Filter by entity type"
          >
            <option value="">All entities</option>
            {ENTITY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 sm:w-40">
          <Select
            value={action}
            onChange={(event) =>
              resetFilterAndPage(setAction, event.target.value as ActivityAction | "")
            }
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
          From
          <Input
            type="date"
            value={since}
            onChange={(event) => resetFilterAndPage(setSince, event.target.value)}
            className="h-9 w-full min-w-0 sm:w-40"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
          To
          <Input
            type="date"
            value={until}
            onChange={(event) => resetFilterAndPage(setUntil, event.target.value)}
            className="h-9 w-full min-w-0 sm:w-40"
          />
        </label>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        {error ? (
          <div
            role="alert"
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-10 text-center"
          >
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              {error instanceof Error ? error.message : "Could not load the activity log"}
            </p>
          </div>
        ) : isFetching && rows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-muted-foreground">
            No activity matches these filters.
          </p>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-200",
              isFetching && "pointer-events-none opacity-60",
            )}
          >
            {/* Below lg the six columns don't fit: one card per entry. */}
            <ul className="divide-y divide-border/50 lg:hidden">
              {rows.map((row) => (
                <LogCard key={row.id} row={row} />
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[110px]" />
                <col className="w-[150px]" />
                <col />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/60 bg-secondary/40">
                  <HeaderCell>When</HeaderCell>
                  <HeaderCell>Who</HeaderCell>
                  <HeaderCell>Action</HeaderCell>
                  <HeaderCell>Entity</HeaderCell>
                  <HeaderCell>Changes</HeaderCell>
                  <HeaderCell>IP</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LogRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="border-t border-border/60 px-3 py-4 sm:px-5">
            <ResultsPagination
              page={data?.page ?? page}
              pageCount={data?.pages ?? 1}
              total={total}
              pageSize={pageSize}
              itemLabel="entries"
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPill({ action }: { action: ActivityAction }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
      <span className={cn("size-1.5 shrink-0 rounded-full", ACTION_DOT[action] ?? "bg-muted-foreground")} />
      {action}
    </span>
  );
}

/** The phone / tablet counterpart of `LogRow`: action and entity lead, since
 *  that is what someone scanning an audit trail reads first. */
function LogCard({ row }: { row: AuditLogEntry }) {
  const changes = formatChanges(row.changes);
  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-2">
        <ActionPill action={row.action} />
        <span className="min-w-0 truncate text-xs font-semibold text-foreground">
          {row.entity_type.replaceAll("_", " ")}
          {row.entity_id !== null && (
            <span className="font-medium text-muted-foreground"> #{row.entity_id}</span>
          )}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">
        <span className="font-semibold text-foreground">{row.user_name ?? "System"}</span>
        {" · "}
        {formatDateTime(row.occurred_at)}
      </p>
      {changes !== "—" && (
        <p
          className="mt-1.5 line-clamp-3 break-all rounded-lg bg-secondary/40 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground"
          title={changes}
        >
          {changes}
        </p>
      )}
      {row.ip && (
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/80">IP {row.ip}</p>
      )}
    </li>
  );
}

function LogRow({ row }: { row: AuditLogEntry }) {
  return (
    <tr className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/25">
      <td className="px-4 py-3 text-xs font-medium text-muted-foreground">
        {formatDateTime(row.occurred_at)}
      </td>
      <td className="overflow-hidden px-4 py-3 text-xs font-semibold text-foreground">
        <span className="truncate" title={row.user_name ?? undefined}>
          {row.user_name ?? "System"}
        </span>
      </td>
      <td className="px-4 py-3">
        <ActionPill action={row.action} />
      </td>
      <td className="overflow-hidden px-4 py-3 text-xs font-medium text-foreground">
        {row.entity_type.replaceAll("_", " ")}
        {row.entity_id !== null && (
          <span className="text-muted-foreground"> #{row.entity_id}</span>
        )}
      </td>
      <td className="overflow-hidden px-4 py-3 text-xs font-medium text-muted-foreground">
        <span className="line-clamp-2" title={formatChanges(row.changes)}>
          {formatChanges(row.changes)}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
        {row.ip ?? "—"}
      </td>
    </tr>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-foreground">
      {children}
    </th>
  );
}
