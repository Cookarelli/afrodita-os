import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ApplianceForm } from "@/components/os/appliance-form";
import { AppliancePhotoUploader } from "@/components/os/appliance-photo-uploader";
import { OperationalHeader, PageNotice, primaryButtonClass } from "@/components/os/operational-ui";
import { requirePermission } from "@/lib/auth/session";
import {
  deleteAppliancePhotoAction,
  moveAppliancePhotoAction,
  setApplianceCoverPhotoAction,
  updateDetailedApplianceAction,
} from "@/lib/os/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApplianceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requirePermission("manage_inventory");
  const [{ id }, query, supabase] = await Promise.all([
    params,
    searchParams,
    createSupabaseServerClient(),
  ]);
  const [{ data: appliance }, { data: locations }, { data: costs }, { data: photos }] =
    await Promise.all([
      supabase
        .from("appliances")
        .select(
          "id, organization_id, inventory_number, category, brand, model, serial_number, color, condition, inventory_location_id, status, public_price_cents, minimum_authorized_price_cents, public_visibility, featured, public_description, internal_notes",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("inventory_locations").select("id, name").eq("active", true).order("name"),
      supabase
        .from("appliance_costs")
        .select("cost_type, amount_cents")
        .eq("appliance_id", id)
        .is("archived_at", null),
      supabase
        .from("appliance_photos")
        .select("id, object_path, sort_order")
        .eq("appliance_id", id)
        .is("archived_at", null)
        .order("sort_order"),
    ]);
  if (!appliance) notFound();
  const totalInvested = (costs ?? []).reduce((sum, cost) => sum + cost.amount_cents, 0);
  const price = appliance.public_price_cents ?? 0;
  const profit = price - totalInvested;
  const acquisition = costs?.find((cost) => cost.cost_type === "acquisition")?.amount_cents;
  const repair = costs?.find((cost) => cost.cost_type === "repair_part")?.amount_cents;
  return (
    <section>
      <OperationalHeader
        title={appliance.inventory_number}
        description="Edit inventory, costs, publication, and photos."
      >
        <Link className="text-sm font-semibold underline" href="/os/inventory">
          Back to inventory
        </Link>
      </OperationalHeader>
      <PageNotice searchParams={query} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Total invested</p>
          <strong className="text-xl">${(totalInvested / 100).toFixed(2)}</strong>
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Expected gross profit</p>
          <strong className="text-xl">${(profit / 100).toFixed(2)}</strong>
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-sm text-[var(--muted)]">Expected gross margin</p>
          <strong className="text-xl">
            {price ? `${((profit / price) * 100).toFixed(1)}%` : "—"}
          </strong>
        </div>
      </div>
      <ApplianceForm
        action={updateDetailedApplianceAction}
        appliance={appliance}
        locations={locations ?? []}
        acquisitionCost={acquisition}
        repairCost={repair}
      />
      <div className="mt-6 grid gap-4">
        <AppliancePhotoUploader applianceId={id} organizationId={appliance.organization_id} />
        {photos?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <div className="rounded-xl border border-[var(--border)] bg-white p-3" key={photo.id}>
                <Image
                  className="h-44 w-full rounded-lg object-cover"
                  src={`/api/public/appliance-photo?path=${encodeURIComponent(photo.object_path)}`}
                  alt="Appliance"
                  width={640}
                  height={440}
                  unoptimized
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={setApplianceCoverPhotoAction}>
                    <input name="applianceId" type="hidden" value={id} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <button className={primaryButtonClass}>
                      {index === 0 ? "Cover photo" : "Make cover"}
                    </button>
                  </form>
                  <form action={moveAppliancePhotoAction}>
                    <input name="applianceId" type="hidden" value={id} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <input name="direction" type="hidden" value="up" />
                    <button
                      className="min-h-11 rounded-lg border px-3 text-sm font-semibold"
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveAppliancePhotoAction}>
                    <input name="applianceId" type="hidden" value={id} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <input name="direction" type="hidden" value="down" />
                    <button
                      className="min-h-11 rounded-lg border px-3 text-sm font-semibold"
                      disabled={index === photos.length - 1}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={deleteAppliancePhotoAction}>
                    <input name="applianceId" type="hidden" value={id} />
                    <input name="photoId" type="hidden" value={photo.id} />
                    <button className="min-h-11 rounded-lg border px-3 text-sm font-semibold">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
