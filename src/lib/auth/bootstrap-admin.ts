import { z } from "zod";
import { randomBytes } from "node:crypto";
import { readPublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bootstrapInputSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
});

const organizationSlug = "afrodita-appliances";
const organizationName = "Afrodita Appliances";

type BootstrapAdminResult = {
  authUserCreated: boolean;
  existingAuthUserReused: boolean;
  emailInvitationSent: boolean;
  invitationAttempted: boolean;
  rateLimitFallbackUsed: boolean;
  organizationCreated: boolean;
  profileCreated: boolean;
  membershipCreated: boolean;
  roleAssigned: boolean;
  temporaryPassword: string | null;
};

type SupabaseFailure = {
  code?: string | null;
  message: string;
  status?: number | null;
};

function describeSupabaseFailure(context: string, error: SupabaseFailure) {
  const details = [
    error.message,
    error.status == null ? null : `status ${error.status}`,
    error.code ? `code ${error.code}` : null,
  ].filter(Boolean);
  return `${context}: ${details.join("; ")}`;
}

function displayNameFromEmail(email: string) {
  const localPart = email.split("@", 1)[0] ?? "Administrator";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function createTemporaryPassword() {
  return `${randomBytes(32).toString("base64url")}Aa1!`;
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(describeSupabaseFailure("Unable to inspect existing Auth users", error));
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Too many Auth users to safely locate the requested email.");
}

export async function bootstrapSuperAdmin(untrustedInput: { email: string }) {
  const { email } = bootstrapInputSchema.parse(untrustedInput);
  const admin = createSupabaseAdminClient();
  const result: BootstrapAdminResult = {
    authUserCreated: false,
    existingAuthUserReused: false,
    emailInvitationSent: false,
    invitationAttempted: false,
    rateLimitFallbackUsed: false,
    organizationCreated: false,
    profileCreated: false,
    membershipCreated: false,
    roleAssigned: false,
    temporaryPassword: null,
  };

  const { data: matchingOrganizations, error: organizationLookupError } = await admin
    .from("organizations")
    .select("id")
    .or(
      `slug.eq.${organizationSlug},public_name.eq.${organizationName},legal_name.eq.${organizationName}`,
    )
    .is("archived_at", null);
  if (organizationLookupError)
    throw new Error(
      describeSupabaseFailure("Unable to inspect the Afrodita organization", organizationLookupError),
    );
  if ((matchingOrganizations?.length ?? 0) > 1)
    throw new Error("More than one Afrodita organization matched; no changes were made.");

  let organizationId = matchingOrganizations?.[0]?.id;
  if (!organizationId) {
    const { data: organization, error } = await admin
      .from("organizations")
      .insert({
        slug: organizationSlug,
        legal_name: organizationName,
        public_name: organizationName,
        status: "active",
        timezone: "America/Chicago",
      })
      .select("id")
      .single();
    if (error)
      throw new Error(describeSupabaseFailure("Unable to create the Afrodita organization", error));
    if (!organization) throw new Error("Unable to create the Afrodita organization.");
    organizationId = organization.id;
    result.organizationCreated = true;
  }

  let authUserId = await findAuthUserIdByEmail(email);
  if (authUserId) result.existingAuthUserReused = true;
  if (!authUserId) {
    const { NEXT_PUBLIC_SITE_URL } = readPublicEnv();
    result.invitationAttempted = true;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/os`,
    });
    if (error || !data.user) {
      const existingAuthUserId = await findAuthUserIdByEmail(email);
      if (!existingAuthUserId) {
        if (error?.code === "over_email_send_rate_limit") {
          const temporaryPassword = createTemporaryPassword();
          const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            password: temporaryPassword,
          });
          if (createUserError || !createdUser.user) {
            const racedAuthUserId = await findAuthUserIdByEmail(email);
            if (racedAuthUserId) {
              authUserId = racedAuthUserId;
              result.existingAuthUserReused = true;
            } else if (createUserError) {
              throw new Error(
                describeSupabaseFailure(
                  "Unable to create the Auth user after invitation rate limiting",
                  createUserError,
                ),
              );
            } else {
              throw new Error("Unable to create the Auth user after invitation rate limiting.");
            }
          } else {
            authUserId = createdUser.user.id;
            result.authUserCreated = true;
            result.rateLimitFallbackUsed = true;
            result.temporaryPassword = temporaryPassword;
          }
        } else if (error) {
          throw new Error(describeSupabaseFailure("Unable to create the Auth invitation", error));
        } else {
          throw new Error("Unable to create the Auth invitation: Supabase returned no user.");
        }
      }
      if (existingAuthUserId) {
        authUserId = existingAuthUserId;
        result.existingAuthUserReused = true;
      }
    } else {
      authUserId = data.user.id;
      result.authUserCreated = true;
      result.emailInvitationSent = true;
    }
  }

  const { data: existingProfile, error: profileLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (profileLookupError)
    throw new Error(describeSupabaseFailure("Unable to inspect the administrator profile", profileLookupError));

  let profileId = existingProfile?.id;
  if (!profileId) {
    const { data: profile, error } = await admin
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        display_name: displayNameFromEmail(email),
        status: "active",
      })
      .select("id")
      .single();
    if (error)
      throw new Error(describeSupabaseFailure("Unable to create the administrator profile", error));
    if (!profile) throw new Error("Unable to create the administrator profile.");
    profileId = profile.id;
    result.profileCreated = true;
  } else {
    const { error } = await admin
      .from("profiles")
      .update({ status: "active", disabled_at: null, disabled_reason: null })
      .eq("id", profileId);
    if (error)
      throw new Error(describeSupabaseFailure("Unable to activate the administrator profile", error));
  }

  const { data: existingMembership, error: membershipLookupError } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (membershipLookupError)
    throw new Error(
      describeSupabaseFailure("Unable to inspect the administrator membership", membershipLookupError),
    );

  let membershipId = existingMembership?.id;
  if (!membershipId) {
    const { data: membership, error } = await admin
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        profile_id: profileId,
        member_kind: "owner",
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error)
      throw new Error(
        describeSupabaseFailure("Unable to create the administrator membership", error),
      );
    if (!membership) throw new Error("Unable to create the administrator membership.");
    membershipId = membership.id;
    result.membershipCreated = true;
  } else {
    const { error } = await admin
      .from("organization_members")
      .update({ status: "active", ended_at: null })
      .eq("id", membershipId);
    if (error)
      throw new Error(
        describeSupabaseFailure("Unable to activate the administrator membership", error),
      );
  }

  const { data: activeRole, error: roleLookupError } = await admin
    .from("role_assignments")
    .select("id")
    .eq("organization_member_id", membershipId)
    .eq("role", "super_admin")
    .is("revoked_at", null)
    .maybeSingle();
  if (roleLookupError)
    throw new Error(describeSupabaseFailure("Unable to inspect the administrator role", roleLookupError));
  if (!activeRole) {
    const { error } = await admin.from("role_assignments").insert({
      organization_member_id: membershipId,
      role: "super_admin",
      notes: "Initial administrator bootstrap",
    });
    if (error)
      throw new Error(describeSupabaseFailure("Unable to assign the super administrator role", error));
    result.roleAssigned = true;
  }

  return result;
}
