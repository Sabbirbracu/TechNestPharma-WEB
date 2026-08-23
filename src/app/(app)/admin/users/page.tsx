import type { Metadata } from "next";
import { UsersWorkspace } from "@/components/admin/users-workspace";

export const metadata: Metadata = { title: "Users" };

/** Admin user management — list, roles, suspend/reactivate, delete
 *  (SRS FR-ADM extension, 2026-08-23). Owner only; the API enforces it. */
export default function AdminUsersPage() {
  return <UsersWorkspace />;
}
