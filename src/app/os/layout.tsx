import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireAnyPermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OsLayout({ children }: { children: ReactNode }) {
  const authorization = await requireAnyPermission(["internal_access", "view_investor_summary"]);
  return (
    <AppShell authorization={authorization} surface="internal">
      {children}
    </AppShell>
  );
}
