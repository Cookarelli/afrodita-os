import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Company-scoped appliance requests and reservations."
      permission="property_manager_access"
      title="Orders and reservations"
    />
  );
}
