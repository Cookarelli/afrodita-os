import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Delivery roles receive assigned-work details only through scoped database policies and RPCs."
      permission="view_operations"
      title="Deliveries"
    />
  );
}
