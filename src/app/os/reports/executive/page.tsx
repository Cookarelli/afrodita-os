import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Read-only aggregate metrics without customer PII, employee notes, serial numbers, or raw costs."
      permission="view_investor_summary"
      title="Executive summary"
    />
  );
}
