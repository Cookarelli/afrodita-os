import type { InventoryFilters, PublicAppliance } from "./types";

export const PAGE_SIZE = 6;

const matches = (value: string | null, expected?: string) =>
  !expected || value?.toLocaleLowerCase() === expected.toLocaleLowerCase();

export function filterPublicInventory(items: PublicAppliance[], filters: InventoryFilters) {
  const query = filters.query?.trim().toLocaleLowerCase();
  const filtered = items.filter((item) => {
    const haystack = [
      item.inventoryNumber,
      item.category,
      item.brand,
      item.model,
      item.color,
      item.finish,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      matches(item.category, filters.category) &&
      matches(item.brand, filters.brand) &&
      matches(item.color, filters.color) &&
      matches(item.finish, filters.finish) &&
      matches(item.fuelType, filters.fuelType) &&
      (!filters.width || item.widthInches === filters.width) &&
      (!filters.minPrice || (item.priceCents ?? 0) >= filters.minPrice * 100) &&
      (!filters.maxPrice || (item.priceCents ?? Number.MAX_SAFE_INTEGER) <= filters.maxPrice * 100)
    );
  });
  filtered.sort((a, b) => {
    switch (filters.sort) {
      case "price-asc":
        return (
          (a.priceCents ?? Number.MAX_SAFE_INTEGER) - (b.priceCents ?? Number.MAX_SAFE_INTEGER)
        );
      case "price-desc":
        return (b.priceCents ?? -1) - (a.priceCents ?? -1);
      case "category":
        return a.category.localeCompare(b.category);
      case "brand":
        return (a.brand ?? "").localeCompare(b.brand ?? "");
      default:
        return (b.availableAt ?? "").localeCompare(a.availableAt ?? "");
    }
  });
  const page = Math.max(1, filters.page ?? 1);
  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
  };
}
