import { createApplianceAction, updateApplianceStatusAction } from "@/lib/os/actions";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EmptyState,
  OperationalHeader,
  PageNotice,
  controlClass,
  primaryButtonClass,
} from "@/components/os/operational-ui";

const statuses = [
  "intake",
  "inspection",
  "repair",
  "cleaning",
  "ready",
  "available",
  "reservation_pending",
  "reserved",
  "sold",
  "parts",
  "scrapped",
  "returned",
  "unavailable",
  "archived",
] as const;
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; success?: string; error?: string }>;
}) {
  const [auth, params] = await Promise.all([requirePermission("view_inventory"), searchParams]);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("appliances")
    .select(
      "id, inventory_number, category, brand, model, status, public_visibility, public_price_cents, available_at, updated_at",
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (params.q)
    query = query.or(
      `inventory_number.ilike.%${params.q}%,brand.ilike.%${params.q}%,model.ilike.%${params.q}%,category.ilike.%${params.q}%`,
    );
  if (params.status && statuses.includes(params.status as (typeof statuses)[number]))
    query = query.eq("status", params.status);
  const canManage = hasPermission(auth, "manage_inventory");
  const [{ data: appliances, error }, { data: inventoryLocations }] = await Promise.all([
    query,
    canManage
      ? supabase.from("inventory_locations").select("id, name").eq("is_active", true).order("name")
      : Promise.resolve({ data: null }),
  ]);
  return (
    <section>
      <OperationalHeader
        title="Inventory"
        description="Track appliance intake, readiness, location workflow, and public availability."
      />
      <PageNotice searchParams={params} />
      <form
        className="mb-6 flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-white p-4"
        action="/os/inventory"
      >
        <input
          className={`${controlClass} min-w-56 flex-1`}
          name="q"
          defaultValue={params.q}
          placeholder="Search number, brand, model, or category"
        />
        <select className={controlClass} name="status" defaultValue={params.status ?? ""}>
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </select>
        <button className={primaryButtonClass}>Filter</button>
      </form>
      {canManage ? (
        <details className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <summary className="cursor-pointer font-semibold">Add appliance</summary>
          <form className="mt-4 grid gap-3 md:grid-cols-2" action={createApplianceAction}>
            <input
              className={controlClass}
              name="inventoryNumber"
              required
              placeholder="Inventory number"
            />
            <input className={controlClass} name="category" required placeholder="Category" />
            <input className={controlClass} name="brand" placeholder="Brand" />
            <input className={controlClass} name="model" placeholder="Model" />
            <select className={controlClass} name="status" defaultValue="intake">
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select className={controlClass} name="inventoryLocationId" defaultValue="">
              <option value="">No location assigned</option>
              {inventoryLocations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <input
              className={controlClass}
              name="publicPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Public price (optional)"
            />
            <textarea
              className={`${controlClass} md:col-span-2`}
              name="description"
              placeholder="Public description (optional)"
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="publicVisibility" type="checkbox" />
              Show publicly when status is Available
            </label>
            <button className={`${primaryButtonClass} justify-self-start`}>Save appliance</button>
          </form>
        </details>
      ) : null}
      {error ? (
        <EmptyState>
          Inventory could not be loaded. Please refresh or contact an administrator.
        </EmptyState>
      ) : appliances?.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--background)] text-[var(--muted)]">
              <tr>
                <th className="p-3">Appliance</th>
                <th className="p-3">Status</th>
                <th className="p-3">Price</th>
                <th className="p-3">Public</th>
                <th className="p-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {appliances.map((appliance) => (
                <tr className="border-b last:border-0" key={appliance.id}>
                  <td className="p-3">
                    <strong>{appliance.inventory_number}</strong>
                    <br />
                    <span className="text-[var(--muted)]">
                      {[appliance.category, appliance.brand, appliance.model]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="p-3">{titleCase(appliance.status)}</td>
                  <td className="p-3">
                    {appliance.public_price_cents == null
                      ? "—"
                      : `$${(appliance.public_price_cents / 100).toFixed(2)}`}
                  </td>
                  <td className="p-3">{appliance.public_visibility ? "Visible" : "Internal"}</td>
                  <td className="p-3">
                    {canManage ? (
                      <form className="flex gap-2" action={updateApplianceStatusAction}>
                        <input name="id" type="hidden" value={appliance.id} />
                        <select
                          className={controlClass}
                          name="status"
                          defaultValue={appliance.status}
                        >
                          {statuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                          <input
                            name="publicVisibility"
                            type="checkbox"
                            defaultChecked={appliance.public_visibility}
                          />
                          Public
                        </label>
                        <button className={primaryButtonClass}>Save</button>
                      </form>
                    ) : (
                      "Read only"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No appliances match the current filters.</EmptyState>
      )}
    </section>
  );
}
