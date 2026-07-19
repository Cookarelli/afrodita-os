import { AuthCard, submitClassName } from "@/components/auth/auth-card";
import { acceptInvitationAction } from "@/lib/auth/actions";

type AcceptInvitationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const error = typeof query.error === "string";

  return (
    <AuthCard
      description="Confirm this invitation to activate the role and organization membership selected by an administrator."
      title="Accept invitation"
    >
      {error || !token ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          This invitation is invalid, expired, or already used. Ask an administrator for a new one.
        </p>
      ) : (
        <form action={acceptInvitationAction}>
          <input name="token" type="hidden" value={token} />
          <button className={submitClassName} type="submit">
            Activate my Afrodita OS access
          </button>
        </form>
      )}
    </AuthCard>
  );
}
