import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Sensitive integration configuration remains restricted to super and owner administrators."
      permission="manage_integrations"
      title="Settings"
    />
  );
}
