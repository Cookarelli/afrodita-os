import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Repair dispatch, diagnosis, parts, testing, and completion will be built here."
      permission="view_operations"
      title="Repairs"
    />
  );
}
