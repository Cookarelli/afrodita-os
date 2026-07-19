import { describe, expect, it } from "vitest";
import { publicInventoryFields } from "@/lib/os/inventory";

describe("internal inventory public compatibility", () => {
  it("only exposes public available or reserved appliances", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    expect(publicInventoryFields("available", true, now)).toEqual({
      public_visibility: true,
      available_at: now.toISOString(),
    });
    expect(publicInventoryFields("sold", true, now)).toEqual({
      public_visibility: false,
      available_at: null,
    });
    expect(publicInventoryFields("reserved", true, now)).toEqual({
      public_visibility: true,
      available_at: now.toISOString(),
    });
    expect(publicInventoryFields("available", false, now)).toEqual({
      public_visibility: false,
      available_at: null,
    });
  });
});
