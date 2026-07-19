import { AuthCard, fieldClassName, submitClassName } from "@/components/auth/auth-card";
import { updatePasswordAction } from "@/lib/auth/actions";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const query = await searchParams;

  return (
    <AuthCard
      description="Choose a unique password with at least 12 characters."
      title="Choose a new password"
    >
      {query.error ? (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          The password could not be updated. The reset link may have expired.
        </p>
      ) : null}
      <form action={updatePasswordAction}>
        <label className="block font-semibold" htmlFor="password">
          New password
        </label>
        <input
          autoComplete="new-password"
          className={fieldClassName}
          id="password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <label className="mt-4 block font-semibold" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          autoComplete="new-password"
          className={fieldClassName}
          id="confirmPassword"
          minLength={12}
          name="confirmPassword"
          required
          type="password"
        />
        <button className={submitClassName} type="submit">
          Update password
        </button>
      </form>
    </AuthCard>
  );
}
