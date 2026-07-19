import type { Metadata } from "next";
import Link from "next/link";
import { InventoryCard } from "@/components/public/inventory-card";
import { ShopFilters } from "@/components/public/shop-filters";
import { filterPublicInventory, PAGE_SIZE } from "@/lib/public-inventory/filter";
import { listPublicAppliances } from "@/lib/public-inventory/repository";
import type { InventoryFilters, InventorySort } from "@/lib/public-inventory/types";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop Available Appliances",
  description:
    "Browse available used and refurbished refrigerators, washers, dryers, ranges, freezers, and more in Loves Park.",
  alternates: canonicalUrl("/shop") ? { canonical: canonicalUrl("/shop") } : undefined,
};

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const number = (value: string | undefined) =>
  value && Number.isFinite(Number(value)) ? Number(value) : undefined;
const queryString = (params: Params, updates: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const item = one(value);
    if (item) query.set(key, item);
  });
  Object.entries(updates).forEach(([key, value]) =>
    value == null ? query.delete(key) : query.set(key, String(value)),
  );
  return query.toString();
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filters: InventoryFilters = {
    query: one(params.q),
    category: one(params.category),
    brand: one(params.brand),
    color: one(params.color),
    finish: one(params.finish),
    fuelType: one(params.fuel),
    width: number(one(params.width)),
    minPrice: number(one(params.min)),
    maxPrice: number(one(params.max)),
    sort: (one(params.sort) as InventorySort | undefined) ?? "newest",
    page: number(one(params.page)),
  };
  const inventory = await listPublicAppliances();
  const result = filterPublicInventory(inventory, filters);
  const brands = [
    ...new Set(
      inventory.map((item) => item.brand).filter((brand): brand is string => Boolean(brand)),
    ),
  ].sort();
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return (
    <main id="main-content">
      <section className="shop-header">
        <div className="container">
          <p className="eyebrow">Current public inventory</p>
          <h1>Find an appliance that fits</h1>
          <p>
            Every listing below is marked available in Afrodita OS. A reservation request still
            requires staff confirmation.
          </p>
        </div>
      </section>
      <section className="container shop-layout">
        <aside className="desktop-filters" aria-label="Inventory filters">
          <h2>Filter inventory</h2>
          <ShopFilters filters={filters} brands={brands} />
        </aside>
        <div className="shop-results">
          <div className="results-toolbar">
            <p>
              <strong>{result.total}</strong> {result.total === 1 ? "appliance" : "appliances"}
            </p>
            <details className="mobile-filter-drawer">
              <summary className="button button-secondary">Filters</summary>
              <div className="drawer-panel">
                <ShopFilters filters={filters} brands={brands} />
              </div>
            </details>
            <form action="/shop" className="sort-form">
              {Object.entries(params)
                .filter(([key]) => key !== "sort" && key !== "page")
                .map(([key, value]) => (
                  <input key={key} name={key} type="hidden" value={one(value)} />
                ))}
              <label>
                <span>Sort by</span>
                <select name="sort" defaultValue={filters.sort} onChange={undefined}>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="category">Category</option>
                  <option value="brand">Brand</option>
                </select>
              </label>
              <button className="button button-ghost" type="submit">
                Sort
              </button>
            </form>
          </div>
          {result.items.length ? (
            <div className="inventory-grid shop-grid">
              {result.items.map((item) => (
                <InventoryCard appliance={item} key={item.publicId} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No appliances match those filters</h2>
              <p>Try removing a filter, or call to ask what is arriving next.</p>
              <Link className="button button-primary" href="/shop">
                Clear filters
              </Link>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Inventory pages">
              {result.page > 1 && (
                <Link href={`/shop?${queryString(params, { page: result.page - 1 })}`}>
                  ← Previous
                </Link>
              )}
              <span>
                Page {result.page} of {pages}
              </span>
              {result.page < pages && (
                <Link href={`/shop?${queryString(params, { page: result.page + 1 })}`}>Next →</Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
