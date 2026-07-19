import Link from "next/link";
import { ApplianceForm } from "@/components/os/appliance-form";
import { OperationalHeader, PageNotice } from "@/components/os/operational-ui";
import { requirePermission } from "@/lib/auth/session";
import { createDetailedApplianceAction } from "@/lib/os/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewAppliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("manage_inventory");
  const [params, supabase] = await Promise.all([searchParams, createSupabaseServerClient()]);
  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("id, name")
    .eq("active", true)
    .order("name");
  return (
    <section>
      <OperationalHeader
        title="Add appliance"
        description="Start a draft now; complete pricing and photos when ready."
      >
        <Link className="text-sm font-semibold underline" href="/os/inventory">
          Back to inventory
        </Link>
      </OperationalHeader>
      <PageNotice searchParams={params} />
      <ApplianceForm action={createDetailedApplianceAction} locations={locations ?? []} />
    </section>
  );
}
