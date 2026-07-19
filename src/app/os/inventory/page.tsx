import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Appliance intake, location, status, photos, and QR workflows will be built here."
      permission="view_inventory"
      title="Inventory"
    />
  );
}
