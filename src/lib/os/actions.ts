"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applianceStatuses, inventoryCategories, publicInventoryFields } from "@/lib/os/inventory";

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

const inventoryFormSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  inventoryNumber: z.string().trim().max(80).optional(),
  category: z.enum(inventoryCategories.map(([value]) => value) as [string, ...string[]]),
  brand: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  serialNumber: z.string().trim().max(160).optional(),
  color: z.string().trim().max(80).optional(),
  condition: z.string().trim().max(200).optional(),
  inventoryLocationId: z.uuid().optional().or(z.literal("")),
  status: z.enum(applianceStatuses),
  publicPrice: z.coerce.number().nonnegative().optional(),
  minimumPrice: z.coerce.number().nonnegative().optional(),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
  repairCost: z.coerce.number().nonnegative().optional(),
  publicDescription: z.string().trim().max(4000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  publicVisibility: z.string().optional(),
  featured: z.string().optional(),
});

function cents(value: number | undefined) {
  return value == null || Number.isNaN(value) ? null : Math.round(value * 100);
}

async function nextInventoryNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  category: string,
) {
  const prefix = inventoryCategories.find(([value]) => value === category)?.[2] ?? "OTH";
  const { data } = await supabase
    .from("appliances")
    .select("inventory_number")
    .like("inventory_number", `AFR-${prefix}-%`)
    .order("inventory_number", { ascending: false })
    .limit(100);
  const highest = Math.max(
    0,
    ...(data ?? []).map((row) => Number(row.inventory_number.split("-").at(-1)) || 0),
  );
  return `AFR-${prefix}-${String(highest + 1).padStart(4, "0")}`;
}

async function replaceCost(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  applianceId: string,
  profileId: string | null,
  costType: "acquisition" | "repair_part",
  amountCents: number | null,
) {
  const { data: costs, error: lookupError } = await supabase
    .from("appliance_costs")
    .select("id")
    .eq("appliance_id", applianceId)
    .eq("cost_type", costType)
    .is("archived_at", null)
    .order("created_at")
    .limit(1);
  if (lookupError) throw lookupError;
  const existing = costs?.[0];
  if (amountCents == null) return;
  if (existing) {
    const { error } = await supabase
      .from("appliance_costs")
      .update({ amount_cents: amountCents })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("appliance_costs").insert({
    appliance_id: applianceId,
    cost_type: costType,
    amount_cents: amountCents,
    created_by_profile_id: profileId,
  });
  if (error) throw error;
}

async function saveInventoryCosts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  applianceId: string,
  profileId: string | null,
  input: z.infer<typeof inventoryFormSchema>,
) {
  await replaceCost(supabase, applianceId, profileId, "acquisition", cents(input.acquisitionCost));
  await replaceCost(supabase, applianceId, profileId, "repair_part", cents(input.repairCost));
}

export async function createDetailedApplianceAction(formData: FormData) {
  const context = await requirePermission("manage_inventory");
  const input = inventoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId)
    redirectWithMessage("/os/inventory/new", "error", "Check the appliance details and try again.");
  const publicFields = publicInventoryFields(
    input.data.status,
    input.data.publicVisibility === "on",
  );
  if (publicFields.public_visibility && !input.data.inventoryLocationId)
    redirectWithMessage(
      "/os/inventory/new",
      "error",
      "A public appliance needs an active store location.",
    );
  if (
    (input.data.acquisitionCost != null || input.data.repairCost != null) &&
    !hasPermission(context, "view_raw_costs")
  )
    redirectWithMessage(
      "/os/inventory/new",
      "error",
      "You do not have permission to save cost data.",
    );
  const supabase = await createSupabaseServerClient();
  const inventoryNumber =
    input.data.inventoryNumber || (await nextInventoryNumber(supabase, input.data.category));
  const { data: appliance, error } = await supabase
    .from("appliances")
    .insert({
      organization_id: context.organizationId,
      inventory_number: inventoryNumber,
      qr_lookup_id: `os_${crypto.randomUUID().replaceAll("-", "")}`,
      category: input.data.category,
      brand: input.data.brand || null,
      model: input.data.model || null,
      serial_number: input.data.serialNumber || null,
      color: input.data.color || null,
      condition: input.data.condition || null,
      inventory_location_id: input.data.inventoryLocationId || null,
      status: input.data.status,
      public_price_cents: cents(input.data.publicPrice),
      minimum_authorized_price_cents: cents(input.data.minimumPrice),
      public_visibility: publicFields.public_visibility,
      featured: input.data.featured === "on",
      public_description: input.data.publicDescription || null,
      internal_notes: input.data.internalNotes || null,
      available_at: publicFields.available_at,
      created_by_profile_id: context.profileId,
    })
    .select("id")
    .single();
  if (error || !appliance)
    redirectWithMessage(
      "/os/inventory/new",
      "error",
      "The appliance could not be saved. Inventory numbers must be unique.",
    );
  if (hasPermission(context, "view_raw_costs")) {
    try {
      await saveInventoryCosts(supabase, appliance.id, context.profileId, input.data);
    } catch {
      redirectWithMessage(
        `/os/inventory/${appliance.id}`,
        "error",
        "Appliance saved, but cost data needs review.",
      );
    }
  }
  revalidatePath("/os/inventory");
  redirect(`/os/inventory/${appliance.id}`);
}

export async function updateDetailedApplianceAction(formData: FormData) {
  const context = await requirePermission("manage_inventory");
  const input = inventoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!input.success || !input.data.id)
    redirectWithMessage("/os/inventory", "error", "Invalid appliance update.");
  const publicFields = publicInventoryFields(
    input.data.status,
    input.data.publicVisibility === "on",
  );
  if (publicFields.public_visibility && !input.data.inventoryLocationId)
    redirectWithMessage(
      `/os/inventory/${input.data.id}`,
      "error",
      "A public appliance needs an active store location.",
    );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("appliances")
    .update({
      inventory_number: input.data.inventoryNumber || undefined,
      category: input.data.category,
      brand: input.data.brand || null,
      model: input.data.model || null,
      serial_number: input.data.serialNumber || null,
      color: input.data.color || null,
      condition: input.data.condition || null,
      inventory_location_id: input.data.inventoryLocationId || null,
      status: input.data.status,
      public_price_cents: cents(input.data.publicPrice),
      minimum_authorized_price_cents: cents(input.data.minimumPrice),
      public_visibility: publicFields.public_visibility,
      featured: input.data.featured === "on",
      public_description: input.data.publicDescription || null,
      internal_notes: input.data.internalNotes || null,
      available_at: publicFields.available_at,
    })
    .eq("id", input.data.id);
  if (error)
    redirectWithMessage(
      `/os/inventory/${input.data.id}`,
      "error",
      "The appliance could not be updated.",
    );
  if (hasPermission(context, "view_raw_costs")) {
    try {
      await saveInventoryCosts(supabase, input.data.id, context.profileId, input.data);
    } catch {
      redirectWithMessage(
        `/os/inventory/${input.data.id}`,
        "error",
        "Appliance saved, but cost data needs review.",
      );
    }
  }
  revalidatePath("/os/inventory");
  revalidatePath("/shop");
  revalidatePath("/");
  redirectWithMessage(`/os/inventory/${input.data.id}`, "success", "Appliance updated.");
}

export async function registerAppliancePhotoAction(formData: FormData) {
  const context = await requirePermission("manage_inventory");
  const input = z
    .object({ applianceId: z.uuid(), path: z.string().min(1).max(500) })
    .safeParse(Object.fromEntries(formData));
  if (!input.success || !context.organizationId) throw new Error("Invalid photo upload.");
  const supabase = await createSupabaseServerClient();
  const { data: appliance } = await supabase
    .from("appliances")
    .select("organization_id")
    .eq("id", input.data.applianceId)
    .maybeSingle();
  const prefix = `organization/${context.organizationId}/appliances/${input.data.applianceId}/`;
  if (
    !appliance ||
    appliance.organization_id !== context.organizationId ||
    !input.data.path.startsWith(prefix)
  )
    throw new Error("Invalid photo upload.");
  const { data: photos } = await supabase
    .from("appliance_photos")
    .select("sort_order")
    .eq("appliance_id", input.data.applianceId)
    .is("archived_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("appliance_photos").insert({
    appliance_id: input.data.applianceId,
    object_path: input.data.path,
    sort_order: (photos?.[0]?.sort_order ?? -1) + 1,
    public_eligible: true,
    uploaded_by_profile_id: context.profileId,
  });
  if (error) throw new Error("Photo metadata could not be saved.");
  revalidatePath(`/os/inventory/${input.data.applianceId}`);
  revalidatePath("/shop");
}

export async function setApplianceCoverPhotoAction(formData: FormData) {
  await requirePermission("manage_inventory");
  const input = z
    .object({ applianceId: z.uuid(), photoId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) throw new Error("Invalid photo update.");
  const supabase = await createSupabaseServerClient();
  const { data: photos } = await supabase
    .from("appliance_photos")
    .select("id")
    .eq("appliance_id", input.data.applianceId)
    .is("archived_at", null)
    .order("created_at");
  for (const [index, photo] of (photos ?? [])
    .sort((a, b) => (a.id === input.data.photoId ? -1 : b.id === input.data.photoId ? 1 : 0))
    .entries()) {
    await supabase
      .from("appliance_photos")
      .update({ sort_order: index, public_eligible: true })
      .eq("id", photo.id);
  }
  revalidatePath(`/os/inventory/${input.data.applianceId}`);
  revalidatePath("/shop");
}

export async function moveAppliancePhotoAction(formData: FormData) {
  await requirePermission("manage_inventory");
  const input = z
    .object({ applianceId: z.uuid(), photoId: z.uuid(), direction: z.enum(["up", "down"]) })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) throw new Error("Invalid photo order.");
  const supabase = await createSupabaseServerClient();
  const { data: photos } = await supabase
    .from("appliance_photos")
    .select("id, sort_order")
    .eq("appliance_id", input.data.applianceId)
    .is("archived_at", null)
    .order("sort_order");
  const index = (photos ?? []).findIndex((photo) => photo.id === input.data.photoId);
  const targetIndex = input.data.direction === "up" ? index - 1 : index + 1;
  const current = photos?.[index];
  const target = photos?.[targetIndex];
  if (!current || !target) return;
  await supabase.from("appliance_photos").update({ sort_order: -1 }).eq("id", current.id);
  await supabase
    .from("appliance_photos")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);
  await supabase
    .from("appliance_photos")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  revalidatePath(`/os/inventory/${input.data.applianceId}`);
}

export async function deleteAppliancePhotoAction(formData: FormData) {
  await requirePermission("manage_inventory");
  const input = z
    .object({ applianceId: z.uuid(), photoId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!input.success) throw new Error("Invalid photo deletion.");
  const supabase = await createSupabaseServerClient();
  const { data: photo } = await supabase
    .from("appliance_photos")
    .select("object_path")
    .eq("id", input.data.photoId)
    .eq("appliance_id", input.data.applianceId)
    .maybeSingle();
  if (!photo) throw new Error("Photo not found.");
  const { error: removeError } = await supabase.storage
    .from("appliance-photos")
    .remove([photo.object_path]);
  if (removeError) throw new Error("Photo could not be deleted.");
  const { error } = await supabase
    .from("appliance_photos")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", input.data.photoId);
  if (error) throw new Error("Photo metadata could not be deleted.");
  revalidatePath(`/os/inventory/${input.data.applianceId}`);
  revalidatePath("/shop");
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
