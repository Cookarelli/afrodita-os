export const roles = [
  "super_admin",
  "owner_admin",
  "sales_manager",
  "sales_staff",
  "warehouse",
  "delivery_technician",
  "technician",
  "property_manager_admin",
  "property_manager_staff",
  "investor_viewer",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "internal_access",
  "view_inventory",
  "manage_inventory",
  "view_customers",
  "manage_customers",
  "view_sales",
  "manage_sales",
  "view_operations",
  "manage_operations",
  "view_assigned_work",
  "manage_users",
  "manage_roles",
  "manage_integrations",
  "view_raw_costs",
  "view_reports",
  "view_investor_summary",
  "property_manager_access",
  "manage_property_manager_team",
] as const;

export type Permission = (typeof permissions)[number];

export type PermissionOverride = {
  permission: Permission;
  effect: "allow" | "deny";
  expiresAt?: Date;
};

export type AuthorizationContext = {
  profileActive: boolean;
  organizationMembershipActive: boolean;
  propertyManagerMembershipActive?: boolean;
  roles: readonly Role[];
  overrides?: readonly PermissionOverride[];
};

const permissionsByRole: Record<Role, readonly Permission[]> = {
  super_admin: permissions,
  owner_admin: permissions,
  sales_manager: [
    "internal_access",
    "view_inventory",
    "manage_inventory",
    "view_customers",
    "manage_customers",
    "view_sales",
    "manage_sales",
    "view_operations",
    "manage_operations",
    "view_reports",
  ],
  sales_staff: [
    "internal_access",
    "view_inventory",
    "manage_inventory",
    "view_customers",
    "manage_customers",
    "view_sales",
    "manage_sales",
    "view_operations",
    "manage_operations",
  ],
  warehouse: [
    "internal_access",
    "view_inventory",
    "manage_inventory",
    "view_operations",
    "manage_operations",
  ],
  delivery_technician: [
    "internal_access",
    "view_inventory",
    "view_operations",
    "view_assigned_work",
  ],
  technician: ["internal_access", "view_inventory", "view_operations", "view_assigned_work"],
  property_manager_admin: ["property_manager_access", "manage_property_manager_team"],
  property_manager_staff: ["property_manager_access"],
  investor_viewer: ["view_investor_summary"],
};

const nonOverridablePermissions = new Set<Permission>([
  "view_raw_costs",
  "manage_roles",
  "manage_integrations",
]);

export function hasPermission(
  context: AuthorizationContext,
  permission: Permission,
  now = new Date(),
): boolean {
  if (!context.profileActive || !context.organizationMembershipActive) {
    return false;
  }

  if (
    (permission === "property_manager_access" || permission === "manage_property_manager_team") &&
    !context.propertyManagerMembershipActive
  ) {
    return false;
  }

  const activeOverrides = (context.overrides ?? []).filter(
    (override) => !override.expiresAt || override.expiresAt > now,
  );

  if (
    activeOverrides.some(
      (override) => override.permission === permission && override.effect === "deny",
    )
  ) {
    return false;
  }

  const roleAllows = context.roles.some((role) => permissionsByRole[role].includes(permission));
  if (nonOverridablePermissions.has(permission)) {
    return roleAllows;
  }

  return (
    roleAllows ||
    activeOverrides.some(
      (override) => override.permission === permission && override.effect === "allow",
    )
  );
}

export function canViewCosts(role: Role): boolean {
  return hasPermission(
    {
      profileActive: true,
      organizationMembershipActive: true,
      roles: [role],
    },
    "view_raw_costs",
  );
}

export function isReadOnlyRole(role: Role): boolean {
  return role === "investor_viewer";
}
