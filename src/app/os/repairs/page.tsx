import { createRepairRequestAction, updateRepairStatusAction } from "@/lib/os/actions";
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
  "new",
  "assigned",
  "diagnosing",
  "waiting_parts",
  "repairing",
  "testing",
  "completed",
  "cancelled",
] as const;
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
type RepairRow = {
  id: string;
  status: string;
  diagnosis: string | null;
  service_requests: {
    appliance_type: string;
    problem_description: string;
    customers: { display_name: string } | null;
    appliances: { inventory_number: string } | null;
  } | null;
};

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; success?: string; error?: string }>;
}) {
  const [auth, params] = await Promise.all([requirePermission("view_operations"), searchParams]);
  const supabase = await createSupabaseServerClient();
  let jobsQuery = supabase
    .from("repair_jobs")
    .select<string, RepairRow>(
      "id, status, diagnosis, work_performed, scheduled_at, completed_at, service_requests(id, appliance_type, problem_description, urgency, customer_id, appliance_id, customers(display_name), appliances(inventory_number, brand, model))",
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (params.status && statuses.includes(params.status as (typeof statuses)[number]))
    jobsQuery = jobsQuery.eq("status", params.status);
  const [{ data: jobs, error }, { data: customers }, { data: appliances }] = await Promise.all([
    jobsQuery,
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
          .from("appliances")
          .select("id, inventory_number, brand, model")
          .is("archived_at", null)
          .order("inventory_number")
          .limit(200)
      : Promise.resolve({ data: [] }),
  ]);
  const canManage = hasPermission(auth, "manage_operations");
  return (
    <section>
      <OperationalHeader
        title="Repairs"
        description="Create service requests, link customers and appliances, and move repair jobs through completion."
      />
      <PageNotice searchParams={params} />
      <form
        className="mb-6 flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-white p-4"
        action="/os/repairs"
      >
        <select className={controlClass} name="status" defaultValue={params.status ?? ""}>
          <option value="">All repair statuses</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className={primaryButtonClass}>Filter</button>
      </form>
      {canManage ? (
        <details className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <summary className="cursor-pointer font-semibold">Create repair request</summary>
          <form className="mt-4 grid gap-3 md:grid-cols-2" action={createRepairRequestAction}>
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
            <select className={controlClass} name="applianceId" defaultValue="">
              <option value="">No linked appliance</option>
              {appliances?.map((appliance) => (
                <option key={appliance.id} value={appliance.id}>
                  {appliance.inventory_number} —{" "}
                  {[appliance.brand, appliance.model].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
            <input
              className={controlClass}
              name="applianceType"
              required
              placeholder="Appliance type"
            />
            <select className={controlClass} name="urgency" defaultValue="normal">
              <option>normal</option>
              <option>urgent</option>
              <option>emergency</option>
            </select>
            <textarea
              className={`${controlClass} md:col-span-2`}
              name="problem"
              required
              placeholder="Describe the problem"
            />
            <button className={`${primaryButtonClass} justify-self-start`}>
              Create repair request
            </button>
          </form>
        </details>
      ) : null}
      {error ? (
        <EmptyState>Repair jobs could not be loaded.</EmptyState>
      ) : jobs?.length ? (
        <div className="grid gap-3">
          {jobs.map((job) => {
            const repair = job;
            const request = repair.service_requests;
            const customer = request?.customers ?? null;
            const appliance = request?.appliances ?? null;
            return (
              <details
                className="rounded-xl border border-[var(--border)] bg-white p-4"
                key={repair.id}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>
                      {request?.appliance_type ?? "Repair job"} ·{" "}
                      {customer?.display_name ?? "Customer unavailable"}
                    </strong>
                    <span className="text-sm text-[var(--muted)]">{titleCase(repair.status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {request?.problem_description}
                    {appliance ? ` · ${appliance.inventory_number}` : ""}
                  </p>
                </summary>
                {canManage ? (
                  <form
                    className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[12rem_1fr_auto]"
                    action={updateRepairStatusAction}
                  >
                    <input name="id" type="hidden" value={repair.id} />
                    <select className={controlClass} name="status" defaultValue={repair.status}>
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      className={controlClass}
                      name="diagnosis"
                      defaultValue={repair.diagnosis ?? ""}
                      placeholder="Diagnosis (optional)"
                    />
                    <button className={primaryButtonClass}>Save</button>
                  </form>
                ) : (
                  <p className="mt-4 border-t pt-4 text-sm text-[var(--muted)]">
                    Assigned work is read-only here.
                  </p>
                )}
              </details>
            );
          })}
        </div>
      ) : (
        <EmptyState>No repair jobs match the current filter.</EmptyState>
      )}
    </section>
  );
}
