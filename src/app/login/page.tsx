import Link from "next/link";
import { AuthCard, fieldClassName, submitClassName } from "@/components/auth/auth-card";
import { loginAction } from "@/lib/auth/actions";
import { safeRedirectPath } from "@/lib/auth/route-permissions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const next = safeRedirectPath(typeof query.next === "string" ? query.next : null, "/os");
  const hasError = typeof query.error === "string";

  return (
    <AuthCard
      description="Use the email address from your Afrodita invitation. Open registration is disabled."
      title="Sign in"
    >
      {hasError ? (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          Sign-in was not successful. Check your credentials or contact an administrator.
        </p>
      ) : null}
      <form action={loginAction}>
        <input name="next" type="hidden" value={next} />
        <label className="block font-semibold" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={fieldClassName}
          id="email"
          name="email"
          required
          type="email"
        />
        <label className="mt-4 block font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={fieldClassName}
          id="password"
          name="password"
          required
          type="password"
        />
        <button className={submitClassName} type="submit">
          Sign in securely
        </button>
      </form>
      <Link
        className="mt-5 inline-block font-semibold text-[var(--brand)] underline"
        href="/forgot-password"
      >
        Forgot your password?
      </Link>
    </AuthCard>
  );
}
