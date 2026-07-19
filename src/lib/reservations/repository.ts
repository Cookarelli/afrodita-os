import { createClient } from "@supabase/supabase-js";
import type { ReservationRequest } from "./schema";

export interface ReservationResult {
  reference: string;
  expiresAt: string;
  duplicateReviewRequired: boolean;
}
export class ReservationConflictError extends Error {}

const previewClaims = new Map<string, ReservationResult>();

export function resetPreviewReservations() {
  previewClaims.clear();
}

export async function createReservation(input: ReservationRequest): Promise<ReservationResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test")
      throw new Error("Reservations are not configured.");
    if (previewClaims.has(input.appliancePublicId))
      throw new ReservationConflictError(
        "This appliance already has an active reservation request.",
      );
    const result = {
      reference: `AFR-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      duplicateReviewRequired: false,
    };
    previewClaims.set(input.appliancePublicId, result);
    return result;
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("create_public_reservation", {
    target_public_id: input.appliancePublicId,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    email: input.email,
    fulfillment: input.fulfillment,
    preferred_date: input.preferredDate,
    delivery_address_line_1: input.addressLine1 || null,
    delivery_address_line_2: input.addressLine2 || null,
    delivery_city: input.city || null,
    delivery_state: input.state || null,
    delivery_postal_code: input.postalCode || null,
    customer_notes: input.notes || null,
    communication_consent: input.communicationConsent,
    confirmation_acknowledged: input.confirmationAcknowledged,
    expiration_hours: Number(process.env.RESERVATION_EXPIRATION_HOURS ?? 24),
  });
  if (error) {
    if (error.code === "23505" || error.message.includes("no longer available"))
      throw new ReservationConflictError("This appliance is no longer available to reserve.");
    throw new Error("We could not submit the reservation request.");
  }
  const row = data?.[0];
  return {
    reference: row.reservation_reference,
    expiresAt: row.expires_at,
    duplicateReviewRequired: row.duplicate_review_required,
  };
}
