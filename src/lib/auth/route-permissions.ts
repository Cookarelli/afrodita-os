import { hasPermission, type AuthorizationContext, type Permission } from "@/lib/roles";

type RouteRule = {
  prefix: string;
  permission: Permission;
};

const routeRules: readonly RouteRule[] = [
  { prefix: "/os/users", permission: "manage_users" },
  { prefix: "/os/settings", permission: "manage_integrations" },
  { prefix: "/os/reports/executive", permission: "view_investor_summary" },
  { prefix: "/os/reports", permission: "view_reports" },
  { prefix: "/os/customers", permission: "view_customers" },
  { prefix: "/os/sales", permission: "view_sales" },
  { prefix: "/os/reservations", permission: "view_sales" },
  { prefix: "/os/inventory", permission: "view_inventory" },
  { prefix: "/os", permission: "internal_access" },
  { prefix: "/property-manager/team", permission: "manage_property_manager_team" },
  { prefix: "/property-manager", permission: "property_manager_access" },
];

export function permissionForPath(pathname: string): Permission | null {
  return (
    routeRules.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      ?.permission ?? null
  );
}

export function safeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (decoded.startsWith("//") || decoded.includes("\\")) {
      return fallback;
    }
    const parsed = new URL(candidate, "http://afrodita.local");
    return parsed.origin === "http://afrodita.local"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function canAccessPath(context: AuthorizationContext, pathname: string): boolean {
  const permission = permissionForPath(pathname);
  return permission ? hasPermission(context, permission) : false;
}
