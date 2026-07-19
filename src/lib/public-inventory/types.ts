export interface PublicPhoto {
  path: string;
  alt: string | null;
}

export interface PublicAppliance {
  publicId: string;
  inventoryNumber: string;
  category: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  finish: string | null;
  widthInches: number | null;
  fuelType: string | null;
  condition: string | null;
  description: string | null;
  priceCents: number | null;
  currency: string;
  availability: "available" | "reserved";
  availableAt: string | null;
  photos: PublicPhoto[];
}

export type InventorySort = "newest" | "price-asc" | "price-desc" | "category" | "brand";

export interface InventoryFilters {
  query?: string;
  category?: string;
  brand?: string;
  color?: string;
  finish?: string;
  width?: number;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: InventorySort;
  page?: number;
}
