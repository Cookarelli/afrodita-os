import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Upcoming and historical deliveries for this company only."
      permission="property_manager_access"
      title="Deliveries"
    />
  );
}
