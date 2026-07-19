import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inventoryWorkflow } from "@/lib/os/inventory";
import {
  EmptyState,
  OperationalHeader,
  PageNotice,
  controlClass,
  primaryButtonClass,
} from "@/components/os/operational-ui";

const labelForStatus = (status: string) =>
  inventoryWorkflow.find(([value]) => value === status)?.[1] ?? status;

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
      "id, inventory_number, category, brand, model, status, public_visibility, public_price_cents, featured, updated_at",
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (params.q)
    query = query.or(
      `inventory_number.ilike.%${params.q}%,brand.ilike.%${params.q}%,model.ilike.%${params.q}%,category.ilike.%${params.q}%`,
    );
  if (params.status && inventoryWorkflow.some(([value]) => value === params.status))
    query = query.eq("status", params.status);
  const { data: appliances, error } = await query;
  const canManage = hasPermission(auth, "manage_inventory");
  return (
    <section>
      <OperationalHeader
        title="Inventory"
        description="Add, price, photograph, and publish appliances from your phone."
      >
        {canManage ? (
          <Link
            className={`${primaryButtonClass} w-full text-center sm:w-auto`}
            href="/os/inventory/new"
          >
            Add appliance
          </Link>
        ) : null}
      </OperationalHeader>
      <PageNotice searchParams={params} />
      <form
        className="mb-5 grid gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-[1fr_auto_auto]"
        action="/os/inventory"
      >
        <input
          className={controlClass}
          name="q"
          defaultValue={params.q}
          placeholder="Search number, brand, or model"
        />
        <select className={controlClass} name="status" defaultValue={params.status ?? ""}>
          <option value="">All statuses</option>
          {inventoryWorkflow.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className={primaryButtonClass}>Filter</button>
      </form>
      {error ? (
        <EmptyState>
          Inventory could not be loaded. Please refresh or contact an administrator.
        </EmptyState>
      ) : appliances?.length ? (
        <div className="grid gap-3">
          {appliances.map((appliance) => (
            <Link
              className="rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--brand)]"
              href={`/os/inventory/${appliance.id}`}
              key={appliance.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-lg">{appliance.inventory_number}</strong>
                  <p className="text-sm text-[var(--muted)]">
                    {[appliance.category, appliance.brand, appliance.model]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold">
                  {labelForStatus(appliance.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>
                  {appliance.public_price_cents == null
                    ? "No asking price"
                    : `$${(appliance.public_price_cents / 100).toFixed(2)}`}
                </span>
                <span>{appliance.public_visibility ? "Public" : "Internal"}</span>
                {appliance.featured ? <span>Featured</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState>No appliances match the current filters.</EmptyState>
      )}
    </section>
  );
}
