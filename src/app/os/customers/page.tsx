import { createCustomerAction, updateCustomerAction } from "@/lib/os/actions";
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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string; error?: string }>;
}) {
  const [auth, params] = await Promise.all([requirePermission("view_customers"), searchParams]);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("customers")
    .select(
      "id, display_name, first_name, last_name, status, created_at, customer_contacts(contact_type, contact_value, is_primary)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (params.q)
    query = query.or(
      `display_name.ilike.%${params.q}%,first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%`,
    );
  const { data: customers, error } = await query;
  const canManage = hasPermission(auth, "manage_customers");
  return (
    <section>
      <OperationalHeader
        title="Customers"
        description="Keep retail customer contact records ready for reservations, repairs, deliveries, and sales."
      />
      <PageNotice searchParams={params} />
      <form
        className="mb-6 flex gap-3 rounded-xl border border-[var(--border)] bg-white p-4"
        action="/os/customers"
      >
        <input
          className={`${controlClass} min-w-56 flex-1`}
          name="q"
          defaultValue={params.q}
          placeholder="Search customer name"
        />
        <button className={primaryButtonClass}>Search</button>
      </form>
      {canManage ? (
        <details className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <summary className="cursor-pointer font-semibold">Add customer</summary>
          <form className="mt-4 grid gap-3 md:grid-cols-2" action={createCustomerAction}>
            <input className={controlClass} name="firstName" required placeholder="First name" />
            <input className={controlClass} name="lastName" required placeholder="Last name" />
            <input
              className={controlClass}
              name="email"
              type="email"
              placeholder="Email (optional)"
            />
            <input className={controlClass} name="phone" placeholder="Phone (optional)" />
            <button className={`${primaryButtonClass} justify-self-start`}>Save customer</button>
          </form>
        </details>
      ) : null}
      {error ? (
        <EmptyState>Customer records could not be loaded.</EmptyState>
      ) : customers?.length ? (
        <div className="grid gap-3">
          {customers.map((customer) => (
            <details
              className="rounded-xl border border-[var(--border)] bg-white p-4"
              key={customer.id}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{customer.display_name}</strong>
                  <span className="text-sm text-[var(--muted)]">{customer.status}</span>
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {(customer.customer_contacts ?? [])
                    .map((contact) => contact.contact_value)
                    .join(" · ") || "No contact details"}
                </div>
              </summary>
              {canManage ? (
                <form
                  className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3"
                  action={updateCustomerAction}
                >
                  <input name="id" type="hidden" value={customer.id} />
                  <input
                    className={controlClass}
                    name="firstName"
                    required
                    defaultValue={customer.first_name ?? ""}
                  />
                  <input
                    className={controlClass}
                    name="lastName"
                    required
                    defaultValue={customer.last_name ?? ""}
                  />
                  <select className={controlClass} name="status" defaultValue={customer.status}>
                    <option value="active">Active</option>
                    <option value="archived">Archive</option>
                  </select>
                  <button className={`${primaryButtonClass} justify-self-start`}>
                    Save changes
                  </button>
                </form>
              ) : null}
            </details>
          ))}
        </div>
      ) : (
        <EmptyState>No customers match the current search.</EmptyState>
      )}
    </section>
  );
}
