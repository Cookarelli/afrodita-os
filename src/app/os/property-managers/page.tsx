import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Afrodita staff will administer tenant companies and portfolio relationships here."
      permission="view_operations"
      title="Property managers"
    />
  );
}
