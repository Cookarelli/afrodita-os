import { AuthCard, submitClassName } from "@/components/auth/auth-card";
import { logoutAction } from "@/lib/auth/actions";

export default function AccountDisabledPage() {
  return (
    <AuthCard
      description="Your profile or organization membership is not active. Contact a super admin or owner admin."
      title="Access is disabled"
    >
      <form action={logoutAction}>
        <button className={submitClassName} type="submit">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
