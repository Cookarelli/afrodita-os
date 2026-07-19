import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Company appliances and public available inventory, without internal costs or notes."
      permission="property_manager_access"
      title="Appliances"
    />
  );
}
