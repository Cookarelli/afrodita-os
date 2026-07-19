import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { readPublicEnv } from "@/lib/env";
import { requirePermission } from "@/lib/auth/session";
import { hashInvitationToken } from "@/lib/auth/tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roles } from "@/lib/roles";

const invitationSchema = z.object({
  email: z.email(),
  intendedRole: z.enum(roles),
  pendingProfileId: z.uuid().optional(),
  propertyManagementCompanyId: z.uuid().optional(),
});

export type CreateInvitationInput = z.infer<typeof invitationSchema>;

export async function createInvitation(untrustedInput: CreateInvitationInput) {
  const input = invitationSchema.parse(untrustedInput);
  const authorization = await requirePermission("manage_users");

  if (!authorization.profileId || !authorization.organizationId) {
    throw new Error("An active administrative membership is required.");
  }
  if (
    (input.intendedRole === "property_manager_admin" ||
      input.intendedRole === "property_manager_staff") &&
    !input.propertyManagementCompanyId
  ) {
    throw new Error("Property-manager invitations require a company.");
  }
  if (
    (input.intendedRole === "super_admin" || input.intendedRole === "owner_admin") &&
    !authorization.roles.includes("super_admin")
  ) {
    throw new Error("Only a super admin may invite full administrators.");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const supabase = await createSupabaseServerClient();
  const { data: invitation, error: insertError } = await supabase
    .from("invitations")
    .insert({
      organization_id: authorization.organizationId,
      pending_profile_id: input.pendingProfileId ?? null,
      property_management_company_id: input.propertyManagementCompanyId ?? null,
      email: input.email,
      intended_role: input.intendedRole,
      token_hash: tokenHash,
      invited_by_profile_id: authorization.profileId,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !invitation) {
    throw new Error("The invitation record could not be created.");
  }

  const { NEXT_PUBLIC_SITE_URL } = readPublicEnv();
  const next = `/accept-invitation?token=${encodeURIComponent(rawToken)}`;
  const admin = createSupabaseAdminClient();
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
  });

  if (emailError) {
    await admin
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invitation.id);
    throw new Error("The invitation email could not be sent.");
  }

  return { invitationId: invitation.id, expiresAt };
}
