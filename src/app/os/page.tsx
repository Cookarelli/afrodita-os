import { ProtectedModule } from "@/components/protected-module";

export default function OperationsPage() {
  return (
    <ProtectedModule
      description="Role-aware operational entry point for Afrodita employees."
      permission="internal_access"
      title="Operations dashboard"
    />
  );
}
