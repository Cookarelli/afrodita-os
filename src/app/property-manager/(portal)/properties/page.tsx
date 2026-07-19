import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Only properties and units owned by the signed-in company can be queried."
      permission="property_manager_access"
      title="Properties and units"
    />
  );
}
