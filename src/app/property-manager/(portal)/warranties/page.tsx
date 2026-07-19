import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Company warranty coverage without private employee notes."
      permission="property_manager_access"
      title="Warranties"
    />
  );
}
