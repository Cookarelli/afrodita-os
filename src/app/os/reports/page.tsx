import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Operational reporting is restricted independently from the investor aggregate."
      permission="view_reports"
      title="Reports"
    />
  );
}
