import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Atomic appliance reservation approval and expiration workflows will be built here."
      permission="view_sales"
      title="Reservations"
    />
  );
}
