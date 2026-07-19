import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export default function UnauthorizedPage() {
  return (
    <AuthCard
      description="Your active role does not include this action or application area."
      title="Permission required"
    >
      <Link className="font-semibold text-[var(--brand)] underline" href="/">
        Return to Afrodita OS
      </Link>
    </AuthCard>
  );
}
