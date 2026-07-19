"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applianceStatuses, publicInventoryFields } from "@/lib/os/inventory";

const repairStatuses = [
  "new",
  "assigned",
  "diagnosing",
  "waiting_parts",
  "repairing",
  "testing",
  "completed",
  "cancelled",
] as const;
const deliveryStatuses = [
  "unscheduled",
  "scheduled",
  "assigned",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
] as const;

function redirectWithMessage(path: string, key: "success" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : digits ? `+${digits}` : "";
}

export async function createApplianceAction(formData: FormData) {
  const context = await requirePermission("manage_inventory");
  const input = z
    .object({
      inventoryNumber: z.string().trim().min(1).max(80),
      category: z.string().trim().min(1).max(80),
      brand: z.string().trim().max(100).optional(),
      model: z.string().trim().max(100).optional(),
      status: z.enum(applianceStatuses),
      publicPrice: z.coerce.number().nonnegative().optional(),
      publicVisibility: z.string().optional(),
      inventoryLocationId: z.uuid().optional().or(z.literal("")),
      description: z.string().trim().max(4000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId)
    redirectWithMessage("/os/inventory", "error", "Check the appliance details and try again.");
  const publicFields = publicInventoryFields(
    input.data.status,
    input.data.publicVisibility === "on",
  );
  if (publicFields.public_visibility && !input.data.inventoryLocationId)
    redirectWithMessage(
      "/os/inventory",
      "error",
      "Choose an active inventory location before making an appliance public.",
    );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("appliances").insert({
    organization_id: context.organizationId,
    inventory_number: input.data.inventoryNumber,
    qr_lookup_id: `os_${crypto.randomUUID().replaceAll("-", "")}`,
    category: input.data.category,
    brand: input.data.brand || null,
    model: input.data.model || null,
    status: input.data.status,
    inventory_location_id: input.data.inventoryLocationId || null,
    public_price_cents:
      input.data.publicPrice == null ? null : Math.round(input.data.publicPrice * 100),
    public_visibility: publicFields.public_visibility,
    public_description: input.data.description || null,
    available_at: publicFields.available_at,
    created_by_profile_id: context.profileId,
  });
  if (error)
    redirectWithMessage(
      "/os/inventory",
      "error",
      "The appliance could not be saved. Inventory numbers must be unique.",
    );
  revalidatePath("/os/inventory");
  revalidatePath("/shop");
  redirectWithMessage("/os/inventory", "success", "Appliance added.");
}

export async function updateApplianceStatusAction(formData: FormData) {
  await requirePermission("manage_inventory");
  const input = z
    .object({
      id: z.uuid(),
      status: z.enum(applianceStatuses),
      publicVisibility: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) redirectWithMessage("/os/inventory", "error", "Invalid appliance update.");
  const publicFields = publicInventoryFields(
    input.data.status,
    input.data.publicVisibility === "on",
  );
  const supabase = await createSupabaseServerClient();
  const { data: appliance, error: applianceError } = await supabase
    .from("appliances")
    .select("inventory_location_id")
    .eq("id", input.data.id)
    .maybeSingle();
  if (applianceError || !appliance)
    redirectWithMessage("/os/inventory", "error", "The appliance could not be found.");
  if (publicFields.public_visibility && !appliance.inventory_location_id)
    redirectWithMessage(
      "/os/inventory",
      "error",
      "Assign an active inventory location before making this appliance public.",
    );
  const { error } = await supabase
    .from("appliances")
    .update({
      status: input.data.status,
      public_visibility: publicFields.public_visibility,
      available_at: publicFields.available_at,
    })
    .eq("id", input.data.id);
  if (error)
    redirectWithMessage("/os/inventory", "error", "The appliance status could not be updated.");
  revalidatePath("/os/inventory");
  revalidatePath("/shop");
  redirectWithMessage("/os/inventory", "success", "Appliance status updated.");
}

export async function createCustomerAction(formData: FormData) {
  const context = await requirePermission("manage_customers");
  const input = z
    .object({
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.string().trim().email().optional().or(z.literal("")),
      phone: z.string().trim().max(40).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId)
    redirectWithMessage("/os/customers", "error", "Check the customer details and try again.");
  const supabase = await createSupabaseServerClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      organization_id: context.organizationId,
      first_name: input.data.firstName,
      last_name: input.data.lastName,
      display_name: `${input.data.firstName} ${input.data.lastName}`,
    })
    .select("id")
    .single();
  if (error || !customer)
    redirectWithMessage("/os/customers", "error", "The customer could not be saved.");
  const contacts: Array<{
    customer_id: string;
    contact_type: "email" | "phone";
    contact_value: string;
    normalized_value: string;
    is_primary: boolean;
  }> = [];
  if (input.data.email) {
    contacts.push({
      customer_id: customer.id,
      contact_type: "email",
      contact_value: input.data.email.toLowerCase(),
      normalized_value: input.data.email.toLowerCase(),
      is_primary: true,
    });
  }
  if (input.data.phone) {
    contacts.push({
      customer_id: customer.id,
      contact_type: "phone",
      contact_value: input.data.phone,
      normalized_value: normalizePhone(input.data.phone),
      is_primary: !input.data.email,
    });
  }
  if (contacts.length) {
    const { error: contactError } = await supabase.from("customer_contacts").insert(contacts);
    if (contactError)
      redirectWithMessage(
        "/os/customers",
        "error",
        "Customer saved, but contact details need review.",
      );
  }
  revalidatePath("/os/customers");
  redirectWithMessage("/os/customers", "success", "Customer added.");
}

export async function updateCustomerAction(formData: FormData) {
  await requirePermission("manage_customers");
  const input = z
    .object({
      id: z.uuid(),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      status: z.enum(["active", "archived"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) redirectWithMessage("/os/customers", "error", "Invalid customer update.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({
      first_name: input.data.firstName,
      last_name: input.data.lastName,
      display_name: `${input.data.firstName} ${input.data.lastName}`,
      status: input.data.status,
      archived_at: input.data.status === "archived" ? new Date().toISOString() : null,
    })
    .eq("id", input.data.id);
  if (error) redirectWithMessage("/os/customers", "error", "The customer could not be updated.");
  revalidatePath("/os/customers");
  redirectWithMessage("/os/customers", "success", "Customer updated.");
}

export async function createRepairRequestAction(formData: FormData) {
  const context = await requirePermission("manage_operations");
  const input = z
    .object({
      customerId: z.uuid(),
      applianceId: z.uuid().optional().or(z.literal("")),
      applianceType: z.string().trim().min(1).max(100),
      problem: z.string().trim().min(3).max(4000),
      urgency: z.enum(["normal", "urgent", "emergency"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId)
    redirectWithMessage("/os/repairs", "error", "Check the repair request and try again.");
  const supabase = await createSupabaseServerClient();
  const { data: request, error } = await supabase
    .from("service_requests")
    .insert({
      organization_id: context.organizationId,
      customer_id: input.data.customerId,
      appliance_id: input.data.applianceId || null,
      appliance_type: input.data.applianceType,
      problem_description: input.data.problem,
      urgency: input.data.urgency,
      created_by_profile_id: context.profileId,
    })
    .select("id")
    .single();
  if (error || !request)
    redirectWithMessage("/os/repairs", "error", "The repair request could not be saved.");
  await supabase.from("repair_jobs").insert({
    service_request_id: request.id,
    appliance_id: input.data.applianceId || null,
    status: "new",
  });
  revalidatePath("/os/repairs");
  redirectWithMessage("/os/repairs", "success", "Repair request created.");
}

export async function updateRepairStatusAction(formData: FormData) {
  await requirePermission("manage_operations");
  const input = z
    .object({
      id: z.uuid(),
      status: z.enum(repairStatuses),
      diagnosis: z.string().trim().max(4000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) redirectWithMessage("/os/repairs", "error", "Invalid repair update.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("repair_jobs")
    .update({
      status: input.data.status,
      diagnosis: input.data.diagnosis || null,
      completed_at: input.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", input.data.id);
  if (error) redirectWithMessage("/os/repairs", "error", "The repair status could not be updated.");
  revalidatePath("/os/repairs");
  redirectWithMessage("/os/repairs", "success", "Repair updated.");
}

export async function createDeliveryAction(formData: FormData) {
  const context = await requirePermission("manage_operations");
  const input = z
    .object({
      customerId: z.uuid(),
      saleId: z.uuid().optional().or(z.literal("")),
      scheduledStart: z.string().optional(),
      contactName: z.string().trim().max(160).optional(),
      contactPhone: z.string().trim().max(40).optional(),
      accessNotes: z.string().trim().max(4000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId)
    redirectWithMessage("/os/deliveries", "error", "Check the delivery details and try again.");
  const scheduled = input.data.scheduledStart ? new Date(input.data.scheduledStart) : null;
  if (scheduled && Number.isNaN(scheduled.getTime()))
    redirectWithMessage("/os/deliveries", "error", "Choose a valid delivery date and time.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deliveries").insert({
    organization_id: context.organizationId,
    customer_id: input.data.customerId,
    sale_id: input.data.saleId || null,
    status: scheduled ? "scheduled" : "unscheduled",
    scheduled_start: scheduled?.toISOString() ?? null,
    customer_contact_name: input.data.contactName || null,
    customer_contact_phone: input.data.contactPhone || null,
    access_notes: input.data.accessNotes || null,
  });
  if (error) redirectWithMessage("/os/deliveries", "error", "The delivery could not be saved.");
  revalidatePath("/os/deliveries");
  redirectWithMessage("/os/deliveries", "success", "Delivery created.");
}

export async function updateDeliveryStatusAction(formData: FormData) {
  await requirePermission("manage_operations");
  const input = z
    .object({
      id: z.uuid(),
      status: z.enum(deliveryStatuses),
      completionNotes: z.string().trim().max(4000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) redirectWithMessage("/os/deliveries", "error", "Invalid delivery update.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("deliveries")
    .update({ status: input.data.status, completion_notes: input.data.completionNotes || null })
    .eq("id", input.data.id);
  if (error)
    redirectWithMessage("/os/deliveries", "error", "The delivery status could not be updated.");
  revalidatePath("/os/deliveries");
  redirectWithMessage("/os/deliveries", "success", "Delivery updated.");
}
