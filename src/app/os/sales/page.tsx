import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Sale conversion and safe payment status records will be built here."
      permission="view_sales"
      title="Sales"
    />
  );
}
