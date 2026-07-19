import Link from "next/link";
import { AuthCard, fieldClassName, submitClassName } from "@/components/auth/auth-card";
import { requestPasswordResetAction } from "@/lib/auth/actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const query = await searchParams;
  const sent = query.sent === "1";

  return (
    <AuthCard
      description="If the address belongs to an active account, Supabase will send a secure reset link."
      title="Reset your password"
    >
      {sent ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900" role="status">
          If an account exists, a reset link has been sent.
        </p>
      ) : (
        <form action={requestPasswordResetAction}>
          <label className="block font-semibold" htmlFor="email">
            Account email
          </label>
          <input className={fieldClassName} id="email" name="email" required type="email" />
          <button className={submitClassName} type="submit">
            Send reset link
          </button>
        </form>
      )}
      <Link className="mt-5 inline-block font-semibold text-[var(--brand)] underline" href="/login">
        Return to sign in
      </Link>
    </AuthCard>
  );
}
