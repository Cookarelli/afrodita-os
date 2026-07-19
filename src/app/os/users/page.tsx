import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Invitation, membership, role, override, and disabled-account administration."
      permission="manage_users"
      title="Users"
    />
  );
}
