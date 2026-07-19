import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Tenant-scoped property portfolio overview."
      permission="property_manager_access"
      title="Property manager dashboard"
    />
  );
}
