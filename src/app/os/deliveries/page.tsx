import { createDeliveryAction, updateDeliveryStatusAction } from "@/lib/os/actions";
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
  "unscheduled",
  "scheduled",
  "assigned",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
] as const;
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; success?: string; error?: string }>;
}) {
  const [auth, params] = await Promise.all([requirePermission("view_operations"), searchParams]);
  const supabase = await createSupabaseServerClient();
  let deliveryQuery = supabase
    .from("deliveries")
    .select(
      "id, sale_id, customer_id, status, scheduled_start, customer_contact_name, customer_contact_phone, access_notes, completion_notes, customers(display_name), customer_addresses(address_line_1, city, state, postal_code)",
    )
    .is("archived_at", null)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .limit(100);
  if (params.status && statuses.includes(params.status as (typeof statuses)[number]))
    deliveryQuery = deliveryQuery.eq("status", params.status);
  const [{ data: deliveries, error }, { data: customers }, { data: sales }] = await Promise.all([
    deliveryQuery,
    hasPermission(auth, "manage_operations")
      ? supabase
          .from("customers")
          .select("id, display_name")
          .eq("status", "active")
          .is("archived_at", null)
          .order("display_name")
          .limit(200)
      : Promise.resolve({ data: [] }),
    hasPermission(auth, "manage_operations")
      ? supabase
          .from("sales")
          .select("id, sale_number")
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);
  const canManage = hasPermission(auth, "manage_operations");
  return (
    <section>
      <OperationalHeader
        title="Deliveries"
        description="Schedule customer delivery work, record contact and access details, and keep delivery status current."
      />
      <PageNotice searchParams={params} />
      <form
        className="mb-6 flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-white p-4"
        action="/os/deliveries"
      >
        <select className={controlClass} name="status" defaultValue={params.status ?? ""}>
          <option value="">All delivery statuses</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className={primaryButtonClass}>Filter</button>
      </form>
      {canManage ? (
        <details className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <summary className="cursor-pointer font-semibold">Create delivery</summary>
          <form className="mt-4 grid gap-3 md:grid-cols-2" action={createDeliveryAction}>
            <select className={controlClass} name="customerId" required defaultValue="">
              <option value="" disabled>
                Select customer
              </option>
              {customers?.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.display_name}
                </option>
              ))}
            </select>
            <select className={controlClass} name="saleId" defaultValue="">
              <option value="">No linked sale</option>
              {sales?.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {sale.sale_number}
                </option>
              ))}
            </select>
            <input className={controlClass} name="scheduledStart" type="datetime-local" />
            <input className={controlClass} name="contactName" placeholder="Delivery contact" />
            <input className={controlClass} name="contactPhone" placeholder="Delivery phone" />
            <textarea
              className={`${controlClass} md:col-span-2`}
              name="accessNotes"
              placeholder="Address, access, or delivery notes"
            />
            <button className={`${primaryButtonClass} justify-self-start`}>Create delivery</button>
          </form>
        </details>
      ) : null}
      {error ? (
        <EmptyState>Deliveries could not be loaded.</EmptyState>
      ) : deliveries?.length ? (
        <div className="grid gap-3">
          {deliveries.map((delivery) => {
            const customer = Array.isArray(delivery.customers)
              ? delivery.customers[0]
              : delivery.customers;
            const address = Array.isArray(delivery.customer_addresses)
              ? delivery.customer_addresses[0]
              : delivery.customer_addresses;
            return (
              <details
                className="rounded-xl border border-[var(--border)] bg-white p-4"
                key={delivery.id}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>
                      {customer?.display_name ?? delivery.customer_contact_name ?? "Delivery"}
                    </strong>
                    <span className="text-sm text-[var(--muted)]">
                      {titleCase(delivery.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {delivery.scheduled_start
                      ? new Date(delivery.scheduled_start).toLocaleString()
                      : "Not scheduled"}
                    {address ? ` · ${address.address_line_1}, ${address.city}` : ""}
                    {delivery.sale_id ? " · Linked sale" : ""}
                  </p>
                </summary>
                <div className="mt-4 border-t pt-4 text-sm text-[var(--muted)]">
                  <p>{delivery.customer_contact_phone ?? "No delivery phone recorded"}</p>
                  {delivery.access_notes ? (
                    <p className="mt-1">Access: {delivery.access_notes}</p>
                  ) : null}
                </div>
                {canManage ? (
                  <form
                    className="mt-3 grid gap-3 md:grid-cols-[12rem_1fr_auto]"
                    action={updateDeliveryStatusAction}
                  >
                    <input name="id" type="hidden" value={delivery.id} />
                    <select className={controlClass} name="status" defaultValue={delivery.status}>
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      className={controlClass}
                      name="completionNotes"
                      defaultValue={delivery.completion_notes ?? ""}
                      placeholder="Completion notes"
                    />
                    <button className={primaryButtonClass}>Save</button>
                  </form>
                ) : null}
              </details>
            );
          })}
        </div>
      ) : (
        <EmptyState>No deliveries match the current filter.</EmptyState>
      )}
    </section>
  );
}
