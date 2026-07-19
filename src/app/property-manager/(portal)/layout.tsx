import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PropertyManagerLayout({ children }: { children: ReactNode }) {
  const authorization = await requirePermission("property_manager_access");
  return (
    <AppShell authorization={authorization} surface="property-manager">
      {children}
    </AppShell>
  );
}
