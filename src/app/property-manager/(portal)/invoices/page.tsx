import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Safe invoice and payment-status references for this company only."
      permission="property_manager_access"
      title="Invoices and payments"
    />
  );
}
