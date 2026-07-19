import Link from "next/link";
import Image from "next/image";
import type { PublicAppliance } from "@/lib/public-inventory/types";

export const categoryLabel = (category: string) =>
  ({
    refrigerator: "Refrigerator",
    washer: "Washer",
    dryer: "Dryer",
    range: "Stove & range",
    freezer: "Freezer",
    "laundry-center": "Laundry center",
    dishwasher: "Dishwasher",
    microwave: "Microwave",
    set: "Appliance set",
    other: "Other appliance",
    miscellaneous: "Miscellaneous",
  })[category] ?? category.replaceAll("-", " ");
export const formatPrice = (cents: number | null) =>
  cents == null
    ? "Call for price"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(cents / 100);

export function InventoryCard({ appliance }: { appliance: PublicAppliance }) {
  return (
    <article className="inventory-card">
      <Link
        className="inventory-image"
        href={`/shop/${appliance.publicId}`}
        aria-label={`View ${appliance.brand ?? ""} ${categoryLabel(appliance.category)}`}
      >
        {appliance.photos[0] ? (
          <Image
            src={appliance.photos[0].path}
            alt={
              appliance.photos[0].alt ??
              `${appliance.brand ?? ""} ${categoryLabel(appliance.category)}`
            }
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 980px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="image-fallback">
            <span aria-hidden="true">♡</span>
            <small>Photo coming soon</small>
          </div>
        )}
        <span className="status-badge">
          {appliance.availability === "reserved" ? "Reserved" : "Available"}
        </span>
      </Link>
      <div className="inventory-body">
        <p className="card-category">{categoryLabel(appliance.category)}</p>
        <h3>
          {appliance.brand ?? "Quality appliance"}
          {appliance.model ? ` ${appliance.model}` : ""}
        </h3>
        <p className="card-details">
          {[
            appliance.color,
            appliance.finish,
            appliance.widthInches ? `${appliance.widthInches}\″` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="price">{formatPrice(appliance.priceCents)}</p>
        <div className="card-actions">
          <Link
            className="button button-primary"
            href={`/reserve?appliance=${encodeURIComponent(appliance.publicId)}`}
          >
            Reserve
          </Link>
          <Link className="button button-secondary" href={`/shop/${appliance.publicId}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
