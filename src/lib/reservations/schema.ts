import { z } from "zod";

const phone = z
  .string()
  .trim()
  .min(10)
  .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.");
const optional = z.string().trim().max(500).optional().or(z.literal(""));

export const reservationRequestSchema = z
  .object({
    appliancePublicId: z.string().min(20).max(120),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone,
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    fulfillment: z.enum(["pickup", "delivery"]),
    preferredDate: z.iso.date(),
    addressLine1: optional,
    addressLine2: optional,
    city: optional,
    state: optional,
    postalCode: optional,
    notes: optional,
    communicationConsent: z.boolean().default(false),
    confirmationAcknowledged: z.literal(
      true,
      "Please acknowledge that staff confirmation is required.",
    ),
  })
  .superRefine((input, context) => {
    if (input.fulfillment !== "delivery") return;
    for (const [path, value, message] of [
      ["addressLine1", input.addressLine1, "Delivery address is required."],
      ["city", input.city, "City is required."],
      ["state", input.state, "State is required."],
      ["postalCode", input.postalCode, "ZIP code is required."],
    ] as const)
      if (!value) context.addIssue({ code: "custom", path: [path], message });
  });

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
