"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { readPublicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/auth/route-permissions";
import { hashInvitationToken } from "@/lib/auth/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function loginAction(formData: FormData) {
  const input = credentialsSchema.safeParse(Object.fromEntries(formData));
  const fallback = "/os";
  const next = safeRedirectPath(formData.get("next")?.toString(), fallback);

  if (!input.success) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.data.email,
    password: input.data.password,
  });

  if (error) {
    redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const input = z.object({ email: z.email() }).safeParse(Object.fromEntries(formData));
  if (!input.success) {
    redirect("/forgot-password?error=invalid");
  }

  const { NEXT_PUBLIC_SITE_URL } = readPublicEnv();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(input.data.email, {
    redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // The same response is used whether an account exists or not.
  redirect("/forgot-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  const input = z
    .object({
      password: z.string().min(12),
      confirmPassword: z.string(),
    })
    .refine(({ confirmPassword, password }) => password === confirmPassword)
    .safeParse(Object.fromEntries(formData));

  if (!input.success) {
    redirect("/reset-password?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/reset-password");
  }

  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) {
    redirect("/reset-password?error=update");
  }

  redirect("/os");
}

export async function acceptInvitationAction(formData: FormData) {
  const input = z
    .object({ token: z.string().min(32).max(256) })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) {
    redirect("/accept-invitation?error=invalid");
  }

  const tokenHash = hashInvitationToken(input.data.token);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/accept-invitation?token=${input.data.token}`)}`);
  }

  const { error } = await supabase.rpc("accept_invitation", {
    invitation_token_hash: tokenHash,
  });
  if (error) {
    redirect("/accept-invitation?error=expired-or-invalid");
  }

  redirect("/os");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
