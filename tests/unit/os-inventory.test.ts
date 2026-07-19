import { describe, expect, it } from "vitest";
import { publicInventoryFields } from "@/lib/os/inventory";

describe("internal inventory public compatibility", () => {
  it("only exposes an appliance when it is explicitly available and public", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    expect(publicInventoryFields("available", true, now)).toEqual({
      public_visibility: true,
      available_at: now.toISOString(),
    });
    expect(publicInventoryFields("sold", true, now)).toEqual({
      public_visibility: false,
      available_at: null,
    });
    expect(publicInventoryFields("available", false, now)).toEqual({
      public_visibility: false,
      available_at: null,
    });
  });
});
