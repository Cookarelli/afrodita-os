import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Retail CRM records are unavailable to delivery, technician, property-manager, and investor roles."
      permission="view_customers"
      title="Customers"
    />
  );
}
