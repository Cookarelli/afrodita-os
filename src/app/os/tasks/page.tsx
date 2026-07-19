import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Assigned operational tasks and visibility-scoped comments will be built here."
      permission="view_operations"
      title="Tasks"
    />
  );
}
