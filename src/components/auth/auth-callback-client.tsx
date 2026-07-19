"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";

type AuthCallbackClientProps = {
  code: string | null;
  next: string;
  type: string | null;
};

function destinationFor(type: string | null, next: string) {
  return type === "invite" || type === "recovery" ? "/reset-password" : next;
}

export function AuthCallbackClient({ code, next, type }: AuthCallbackClientProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const fragmentType = fragment.get("type");

      // Remove the fragment (and any one-time code) before making an Auth call.
      window.history.replaceState(null, "", window.location.pathname);

      const supabase = createSupabaseBrowserClient();
      const destination = destinationFor(fragmentType ?? type, next);
      const result =
        accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("The invitation link is incomplete or has expired.") };

      if (result.error) {
        if (!cancelled) {
          setError("This sign-in link is invalid or has expired. Request a new invitation or password reset.");
        }
        return;
      }

      window.location.replace(destination);
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [code, next, type]);

  return (
    <AuthCard
      description="We are securely establishing your Afrodita OS session."
      title="Completing sign-in"
    >
      {error ? (
        <>
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
          <Link className="mt-5 inline-block font-semibold text-[var(--brand)] underline" href="/login">
            Return to sign in
          </Link>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]" role="status">
          Please wait…
        </p>
      )}
    </AuthCard>
  );
}
