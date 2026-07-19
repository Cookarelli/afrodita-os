import { beforeEach, describe, expect, it } from "vitest";
import {
  createReservation,
  ReservationConflictError,
  resetPreviewReservations,
} from "@/lib/reservations/repository";
import { reservationRequestSchema } from "@/lib/reservations/schema";

const valid = {
  appliancePublicId: "dev_qr_refrigerator_000001",
  firstName: "Taylor",
  lastName: "Example",
  phone: "815-555-0198",
  email: "TAYLOR@example.invalid",
  fulfillment: "pickup" as const,
  preferredDate: "2026-07-20",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
  communicationConsent: true,
  confirmationAcknowledged: true as const,
};

describe("public reservations", () => {
  beforeEach(resetPreviewReservations);
  it("normalizes valid requests and requires delivery addresses", () => {
    expect(reservationRequestSchema.parse(valid).email).toBe("taylor@example.invalid");
    expect(reservationRequestSchema.safeParse({ ...valid, fulfillment: "delivery" }).success).toBe(
      false,
    );
    expect(
      reservationRequestSchema.safeParse({
        ...valid,
        email: "invalid",
        confirmationAcknowledged: false,
      }).success,
    ).toBe(false);
  });
  it("prevents two active preview claims", async () => {
    const parsed = reservationRequestSchema.parse(valid);
    await expect(createReservation(parsed)).resolves.toMatchObject({
      reference: expect.stringMatching(/^AFR-/),
    });
    await expect(createReservation(parsed)).rejects.toBeInstanceOf(ReservationConflictError);
  });
});
