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
  "delivered",
  "parts",
  "parts_only",
  "scrapped",
  "returned",
  "unavailable",
  "archived",
] as const;

export const inventoryWorkflow = [
  ["intake", "Draft"],
  ["inspection", "Needs inspection"],
  ["repair", "Needs repair"],
  ["cleaning", "Ready for cleaning"],
  ["ready", "Ready for photos"],
  ["available", "Available"],
  ["reserved", "Reserved"],
  ["sold", "Sold"],
  ["delivered", "Delivered"],
  ["parts_only", "Parts only"],
] as const;

export const inventoryCategories = [
  ["refrigerator", "Refrigerator", "REF"],
  ["freezer", "Freezer", "FRZ"],
  ["washer", "Washer", "WSH"],
  ["dryer", "Dryer", "DRY"],
  ["range", "Stove / range", "RNG"],
  ["dishwasher", "Dishwasher", "DWS"],
  ["microwave", "Microwave", "MIC"],
  ["set", "Set", "SET"],
  ["other", "Other", "OTH"],
] as const;

export type ApplianceStatus = (typeof applianceStatuses)[number];

export function publicInventoryFields(
  status: ApplianceStatus,
  requestedPublic: boolean,
  now = new Date(),
) {
  const publicVisibility = (status === "available" || status === "reserved") && requestedPublic;
  return {
    public_visibility: publicVisibility,
    available_at: publicVisibility ? now.toISOString() : null,
  };
}
