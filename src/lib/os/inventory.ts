export const applianceStatuses = [
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

export type ApplianceStatus = (typeof applianceStatuses)[number];

export function publicInventoryFields(
  status: ApplianceStatus,
  requestedPublic: boolean,
  now = new Date(),
) {
  const publicVisibility = status === "available" && requestedPublic;
  return {
    public_visibility: publicVisibility,
    available_at: publicVisibility ? now.toISOString() : null,
  };
}
