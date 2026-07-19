import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasPermission,
  roles,
  type AuthorizationContext,
  type Permission,
  type PermissionOverride,
  type Role,
} from "@/lib/roles";

export type SessionAuthorization = AuthorizationContext & {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  organizationId: string | null;
  propertyManagementCompanyIds: readonly string[];
};

function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export async function getSessionAuthorization(): Promise<SessionAuthorization | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    return {
      userId: user.id,
      profileId: profile?.id ?? null,
      displayName: profile?.display_name ?? null,
      organizationId: null,
      propertyManagementCompanyIds: [],
      profileActive: false,
      organizationMembershipActive: false,
      propertyManagerMembershipActive: false,
      roles: [],
    };
  }

  const [{ data: memberships }, { data: companyMemberships }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, organization_id, status")
      .eq("profile_id", profile.id),
    supabase
      .from("property_manager_members")
      .select("property_management_company_id, status")
      .eq("profile_id", profile.id),
  ]);

  const activeMemberships = (memberships ?? []).filter(({ status }) => status === "active");
  const activeMembershipIds = activeMemberships.map(({ id }) => id);
  const activeCompanyIds = (companyMemberships ?? [])
    .filter(({ status }) => status === "active")
    .map(({ property_management_company_id }) => property_management_company_id);

  const [{ data: roleRows }, { data: overrideRows }] = await Promise.all([
    activeMembershipIds.length
      ? supabase
          .from("role_assignments")
          .select("role, property_management_company_id")
          .in("organization_member_id", activeMembershipIds)
          .is("revoked_at", null)
      : Promise.resolve({ data: [] }),
    activeMembershipIds.length
      ? supabase
          .from("permission_overrides")
          .select("permission_key, effect, expires_at")
          .in("organization_member_id", activeMembershipIds)
          .is("revoked_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const activeRoles = (roleRows ?? [])
    .filter(({ property_management_company_id, role }) => {
      if (role !== "property_manager_admin" && role !== "property_manager_staff") {
        return true;
      }
      return Boolean(
        property_management_company_id && activeCompanyIds.includes(property_management_company_id),
      );
    })
    .map(({ role }) => role)
    .filter(isRole);

  const overrides = (overrideRows ?? []).flatMap<PermissionOverride>((row) => {
    const permission = row.permission_key as Permission;
    if (row.effect !== "allow" && row.effect !== "deny") {
      return [];
    }
    return [
      {
        permission,
        effect: row.effect,
        ...(row.expires_at ? { expiresAt: new Date(row.expires_at) } : {}),
      },
    ];
  });

  return {
    userId: user.id,
    profileId: profile.id,
    displayName: profile.display_name,
    organizationId: activeMemberships[0]?.organization_id ?? null,
    propertyManagementCompanyIds: activeCompanyIds,
    profileActive: true,
    organizationMembershipActive: activeMemberships.length > 0,
    propertyManagerMembershipActive: activeCompanyIds.length > 0,
    roles: activeRoles,
    overrides,
  };
}

export async function requireAnyPermission(
  requiredPermissions: readonly Permission[],
): Promise<SessionAuthorization> {
  const context = await getSessionAuthorization();

  if (!context) {
    redirect(`/login?next=${encodeURIComponent("/os")}`);
  }

  if (!context.profileActive || !context.organizationMembershipActive) {
    redirect("/account-disabled");
  }

  if (!requiredPermissions.some((permission) => hasPermission(context, permission))) {
    redirect("/unauthorized");
  }

  return context;
}

export function requirePermission(permission: Permission) {
  return requireAnyPermission([permission]);
}

export function defaultAuthenticatedPath(context: AuthorizationContext): string {
  if (hasPermission(context, "property_manager_access")) {
    return "/property-manager";
  }
  if (hasPermission(context, "view_investor_summary")) {
    return "/os/reports/executive";
  }
  return "/os";
}
