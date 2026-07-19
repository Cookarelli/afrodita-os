import { describe, expect, it } from "vitest";
import { developmentAppliances } from "@/lib/public-inventory/dev-data";
import { filterPublicInventory } from "@/lib/public-inventory/filter";

describe("public inventory filters", () => {
  it("filters by category, appearance, fuel, width, price, and keyword", () => {
    expect(filterPublicInventory(developmentAppliances, { category: "washer" }).items).toHaveLength(
      1,
    );
    expect(
      filterPublicInventory(developmentAppliances, { color: "white", fuelType: "electric" }).total,
    ).toBe(4);
    expect(filterPublicInventory(developmentAppliances, { width: 30 }).items[0]?.category).toBe(
      "range",
    );
    expect(
      filterPublicInventory(developmentAppliances, { minPrice: 500, maxPrice: 600 }).items[0]
        ?.category,
    ).toBe("laundry-center");
    expect(
      filterPublicInventory(developmentAppliances, { query: "Hearthline" }).items[0]?.category,
    ).toBe("range");
  });
  it("sorts without adding private fields to the public model", () => {
    const result = filterPublicInventory(developmentAppliances, { sort: "price-asc" });
    expect(result.items[0]?.priceCents).toBe(27500);
    expect(Object.keys(result.items[0] ?? {})).not.toContain("acquisitionCost");
    expect(Object.keys(result.items[0] ?? {})).not.toContain("serialNumber");
  });
});
