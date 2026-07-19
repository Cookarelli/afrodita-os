import { ProtectedModule } from "@/components/protected-module";
export default function Page() {
  return (
    <ProtectedModule
      description="Company administrators may manage only their own portal team, within Afrodita controls."
      permission="manage_property_manager_team"
      title="Team"
    />
  );
}
