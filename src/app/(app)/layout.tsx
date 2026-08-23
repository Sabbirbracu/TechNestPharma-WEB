import { type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { ForceChangePasswordGate } from "@/components/auth/force-change-password-gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ForceChangePasswordGate>
        <AppShell>{children}</AppShell>
      </ForceChangePasswordGate>
    </RequireAuth>
  );
}
