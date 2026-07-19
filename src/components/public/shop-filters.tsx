import Link from "next/link";
import type { InventoryFilters } from "@/lib/public-inventory/types";

const Select = ({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<[string, string]>;
}) => (
  <label>
    <span>{label}</span>
    <select name={name} defaultValue={value ?? ""}>
      <option value="">All</option>
      {options.map(([optionValue, optionLabel]) => (
        <option value={optionValue} key={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </label>
);

export function ShopFilters({ filters, brands }: { filters: InventoryFilters; brands: string[] }) {
  return (
    <form className="filter-form" action="/shop" method="get">
      <label className="filter-search">
        <span>Search inventory</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.query}
          placeholder="Brand, model, inventory number"
        />
      </label>
      <div className="filter-grid">
        <label>
          <span>Minimum price</span>
          <input
            inputMode="numeric"
            min="0"
            name="min"
            type="number"
            defaultValue={filters.minPrice}
            placeholder="$0"
          />
        </label>
        <label>
          <span>Maximum price</span>
          <input
            inputMode="numeric"
            min="0"
            name="max"
            type="number"
            defaultValue={filters.maxPrice}
            placeholder="Any"
          />
        </label>
        <Select
          name="category"
          label="Category"
          value={filters.category}
          options={[
            ["refrigerator", "Refrigerators"],
            ["washer", "Washers"],
            ["dryer", "Dryers"],
            ["range", "Stoves & ranges"],
            ["freezer", "Freezers"],
            ["laundry-center", "Laundry centers"],
            ["miscellaneous", "Miscellaneous"],
          ]}
        />
        <Select
          name="brand"
          label="Brand"
          value={filters.brand}
          options={brands.map((brand) => [brand, brand])}
        />
        <Select
          name="color"
          label="Color"
          value={filters.color}
          options={[
            ["stainless", "Stainless"],
            ["white", "White"],
            ["black", "Black"],
          ]}
        />
        <Select
          name="finish"
          label="Finish"
          value={filters.finish}
          options={[
            ["stainless", "Stainless"],
            ["painted", "Painted"],
            ["enameled", "Enameled"],
          ]}
        />
        <label>
          <span>Width (inches)</span>
          <input
            inputMode="decimal"
            min="1"
            name="width"
            type="number"
            defaultValue={filters.width}
          />
        </label>
        <Select
          name="fuel"
          label="Fuel type"
          value={filters.fuelType}
          options={[
            ["gas", "Gas"],
            ["electric", "Electric"],
          ]}
        />
        <Select
          name="availability"
          label="Availability"
          value="available"
          options={[["available", "Available now"]]}
        />
      </div>
      <div className="filter-actions">
        <button className="button button-primary" type="submit">
          Apply filters
        </button>
        <Link className="button button-ghost" href="/shop">
          Clear all
        </Link>
      </div>
    </form>
  );
}
