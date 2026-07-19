import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Company-scoped service requests, photos, and status."
      permission="property_manager_access"
      title="Service requests"
    />
  );
}
