"use client";

import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PAGE_SIZES, ResultsPagination } from "@/components/search/results-pagination";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useDebounced } from "@/lib/use-debounced";
import {
  useAdminUsers,
  useChangeUserRole,
  useDeleteUser,
  useReactivateUser,
  useSuspendUser,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { AdminUser, UserRole } from "@/types/api";
import { CreateUserDialog } from "./create-user-dialog";

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner — full access",
  staff: "Staff",
  viewer: "Viewer — read only",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsersWorkspace() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [creating, setCreating] = useState(false);

  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useAdminUsers({
    q: debouncedQuery || undefined,
    role: role || undefined,
    is_active: status === "" ? undefined : status === "active",
    page,
    size: pageSize,
    sort: "created_at",
    order: "desc",
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Users
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Manage accounts, roles, and access.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus strokeWidth={2.25} />
          Add User
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <div className="w-44">
          <Select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as UserRole | "");
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="owner">Owner</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "" | "active" | "suspended");
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        {error ? (
          <div
            role="alert"
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-10 text-center"
          >
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              {error instanceof Error ? error.message : "Could not load users"}
            </p>
          </div>
        ) : isFetching && rows.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-muted-foreground">
            No users match these filters.
          </p>
        ) : (
          <div
            className={cn(
              "overflow-x-auto transition-opacity duration-200",
              isFetching && "pointer-events-none opacity-60",
            )}
          >
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[130px]" />
                <col className="w-[130px]" />
                <col className="w-[130px]" />
                <col className="w-[56px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/60 bg-secondary/40">
                  <HeaderCell>User</HeaderCell>
                  <HeaderCell>Role</HeaderCell>
                  <HeaderCell>Status</HeaderCell>
                  <HeaderCell>Last Login</HeaderCell>
                  <HeaderCell>Created</HeaderCell>
                  <HeaderCell> </HeaderCell>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <UserRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <ResultsPagination
              page={data?.page ?? page}
              pageCount={data?.pages ?? 1}
              total={total}
              pageSize={pageSize}
              itemLabel="users"
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

      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function UserRow({ row }: { row: AdminUser }) {
  const { user: me } = useAuth();
  const isSelf = me?.id === row.id;

  const changeRole = useChangeUserRole();
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const deleteUser = useDeleteUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const busy =
    changeRole.isPending || suspend.isPending || reactivate.isPending || deleteUser.isPending;

  async function onRoleChange(next: UserRole) {
    try {
      await changeRole.mutateAsync({ userId: row.id, role: next });
      toast.success(`${row.full_name}'s role updated`, { duration: 4000 });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not change role");
    }
  }

  async function onSuspend() {
    try {
      await suspend.mutateAsync(row.id);
      toast.success(`${row.full_name} suspended`, { duration: 4000 });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not suspend user");
    }
  }

  async function onReactivate() {
    try {
      await reactivate.mutateAsync(row.id);
      toast.success(`${row.full_name} reactivated`, { duration: 4000 });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not reactivate user");
    }
  }

  async function onDelete() {
    try {
      await deleteUser.mutateAsync(row.id);
      toast.success(`${row.full_name} deleted`, { duration: 5000 });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete user",
        { duration: 7000 },
      );
    } finally {
      setConfirmingDelete(false);
    }
  }

  return (
    <tr className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/25">
      <td className="min-w-0 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar user={row} size="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground" title={row.full_name}>
              {row.full_name}
              {isSelf && <span className="ml-1.5 text-xs font-medium text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs font-medium text-muted-foreground" title={row.email}>
              {row.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <Select
          value={row.role}
          onChange={(event) => onRoleChange(event.target.value as UserRole)}
          disabled={isSelf || busy}
          aria-label={`Role for ${row.full_name}`}
          className="h-9 text-xs"
        >
          <option value="owner">{ROLE_LABEL.owner}</option>
          <option value="staff">{ROLE_LABEL.staff}</option>
          <option value="viewer">{ROLE_LABEL.viewer}</option>
        </Select>
      </td>

      <td className="px-4 py-3.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
            row.is_active
              ? "bg-success/10 text-success ring-success/20"
              : "bg-destructive/10 text-destructive ring-destructive/20",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", row.is_active ? "bg-success" : "bg-destructive")}
          />
          {row.is_active ? "Active" : "Suspended"}
        </span>
      </td>

      <td className="px-4 py-3.5 text-xs font-medium text-muted-foreground">
        {formatDate(row.last_login_at)}
      </td>
      <td className="px-4 py-3.5 text-xs font-medium text-muted-foreground">
        {formatDate(row.created_at)}
      </td>

      <td className="px-2 py-3.5">
        <div className="flex justify-end">
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                disabled={isSelf || busy}
                aria-label={`Actions for ${row.full_name}`}
                className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" strokeWidth={2.25} />
                )}
              </button>
            )}
          >
            {(close) => (
              <>
                {row.is_active ? (
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      onSuspend();
                    }}
                  >
                    <ShieldOff />
                    Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      onReactivate();
                    }}
                  >
                    <UserCheck />
                    Reactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    close();
                    setConfirmingDelete(true);
                  }}
                >
                  <Trash2 />
                  Delete user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </td>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this user?"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{row.full_name}</span>?
              This only succeeds if they have no activity on record — otherwise, suspend
              them instead.
            </>
          }
          confirmLabel="Delete"
          busy={deleteUser.isPending}
          onConfirm={onDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
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
