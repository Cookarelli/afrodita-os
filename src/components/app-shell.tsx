import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { hasPermission, type AuthorizationContext, type Permission } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  permission: Permission;
};

const internalNavigation: readonly NavItem[] = [
  { href: "/os", label: "Dashboard", permission: "internal_access" },
  { href: "/os/inventory", label: "Inventory", permission: "view_inventory" },
  { href: "/os/customers", label: "Customers", permission: "view_customers" },
  { href: "/os/reservations", label: "Reservations", permission: "view_sales" },
  { href: "/os/sales", label: "Sales", permission: "view_sales" },
  { href: "/os/deliveries", label: "Deliveries", permission: "view_operations" },
  { href: "/os/repairs", label: "Repairs", permission: "view_operations" },
  { href: "/os/property-managers", label: "Property managers", permission: "view_operations" },
  { href: "/os/tasks", label: "Tasks", permission: "view_operations" },
  { href: "/os/reports", label: "Reports", permission: "view_reports" },
  {
    href: "/os/reports/executive",
    label: "Executive summary",
    permission: "view_investor_summary",
  },
  { href: "/os/settings", label: "Settings", permission: "manage_integrations" },
  { href: "/os/users", label: "Users", permission: "manage_users" },
];

const propertyManagerNavigation = [
  ["/property-manager", "Dashboard"],
  ["/property-manager/properties", "Properties"],
  ["/property-manager/appliances", "Appliances"],
  ["/property-manager/orders", "Orders"],
  ["/property-manager/service", "Service"],
  ["/property-manager/deliveries", "Deliveries"],
  ["/property-manager/warranties", "Warranties"],
  ["/property-manager/invoices", "Invoices"],
  ["/property-manager/team", "Team"],
] as const;

export function AppShell({
  authorization,
  children,
  surface,
}: {
  authorization: AuthorizationContext & { displayName?: string | null };
  children: ReactNode;
  surface: "internal" | "property-manager";
}) {
  const navigation =
    surface === "internal"
      ? internalNavigation
          .filter(({ permission }) => hasPermission(authorization, permission))
          .map(({ href, label }) => [href, label] as const)
      : propertyManagerNavigation.filter(
          ([href]) =>
            href !== "/property-manager/team" ||
            hasPermission(authorization, "manage_property_manager_team"),
        );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-bold text-[var(--brand)]">Afrodita OS</p>
            <p className="text-sm text-[var(--muted)]">
              {surface === "internal" ? "Internal operations" : "Property manager portal"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {authorization.displayName ? (
              <span className="hidden text-sm text-[var(--muted)] sm:inline">
                {authorization.displayName}
              </span>
            ) : null}
            <form action={logoutAction}>
              <button
                className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-semibold"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[15rem_1fr]">
        <nav
          aria-label="Application"
          className="border-b border-[var(--border)] bg-white p-3 md:min-h-[calc(100vh-77px)] md:border-b-0 md:border-r"
        >
          <ul className="flex gap-2 overflow-x-auto md:flex-col">
            {navigation.map(([href, label]) => (
              <li className="shrink-0" key={href}>
                <Link
                  className="block min-h-11 rounded-lg px-3 py-3 font-semibold hover:bg-[var(--background)]"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
