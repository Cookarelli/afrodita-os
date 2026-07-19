import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplianceViewEvent } from "@/components/public/appliance-view-event";
import { categoryLabel, formatPrice } from "@/components/public/inventory-card";
import { TrackedLink } from "@/components/public/tracked-link";
import { siteContent } from "@/config/site";
import { getPublicAppliance } from "@/lib/public-inventory/repository";
import { canonicalUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const item = await getPublicAppliance(publicId);
  return item
    ? {
        title: `${item.brand ?? "Available"} ${categoryLabel(item.category)}`,
        description:
          item.description ??
          `View this available ${categoryLabel(item.category)} from Afrodita Appliances.`,
        alternates: canonicalUrl(`/shop/${publicId}`)
          ? { canonical: canonicalUrl(`/shop/${publicId}`) }
          : undefined,
      }
    : { title: "Appliance not available" };
}

export default async function AppliancePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const item = await getPublicAppliance(publicId);
  if (!item) notFound();
  const name = `${item.brand ?? "Quality"} ${item.model ?? categoryLabel(item.category)}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: item.inventoryNumber,
    description: item.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: item.priceCents == null ? undefined : item.priceCents / 100,
      availability: "https://schema.org/InStock",
      url: `/shop/${item.publicId}`,
    },
  };
  const specs = [
    ["Inventory number", item.inventoryNumber],
    ["Category", categoryLabel(item.category)],
    ["Brand", item.brand],
    ["Model", item.model],
    ["Color", item.color],
    ["Finish", item.finish],
    ["Width", item.widthInches ? `${item.widthInches}\″` : null],
    ["Fuel type", item.fuelType],
    ["Condition", item.condition],
  ];
  return (
    <main id="main-content">
      <ApplianceViewEvent publicId={item.publicId} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
      />
      <section className="section">
        <div className="container">
          <Link className="back-link" href="/shop">
            ← Back to shop
          </Link>
          <div className="detail-grid">
            <div className="detail-gallery">
              {item.photos.length ? (
                item.photos.map((photo) => (
                  <Image
                    key={photo.path}
                    src={photo.path}
                    alt={photo.alt ?? name}
                    width={900}
                    height={720}
                    sizes="(max-width: 700px) 100vw, 50vw"
                    unoptimized
                  />
                ))
              ) : (
                <div className="image-fallback detail-fallback">
                  <span aria-hidden="true">♡</span>
                  <strong>Photo coming soon</strong>
                  <small>Call if you would like help confirming details.</small>
                </div>
              )}
            </div>
            <div className="detail-copy">
              <span className="status-badge inline-badge">Available</span>
              <p className="card-category">{categoryLabel(item.category)}</p>
              <h1>{name}</h1>
              <p className="detail-price">{formatPrice(item.priceCents)}</p>
              <p className="detail-description">
                {item.description ?? "Contact the store for more information about this appliance."}
              </p>
              <div className="detail-actions">
                <Link
                  className="button button-primary button-large"
                  href={`/reserve?appliance=${encodeURIComponent(item.publicId)}`}
                >
                  Reserve this appliance
                </Link>
                <TrackedLink
                  className="button button-secondary"
                  event="phone_click"
                  href={siteContent.phoneHref}
                >
                  Call {siteContent.phone}
                </TrackedLink>
              </div>
              <div className="detail-notice">
                <strong>Reservation required for a hold</strong>
                <span>Requests are confirmed by staff and do not guarantee a completed sale.</span>
              </div>
              <dl className="spec-list">
                {specs
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              <div className="summary-cards">
                <div>
                  <strong>Warranty</strong>
                  <span>Ask about approved options for qualifying appliances.</span>
                </div>
                <div>
                  <strong>Delivery</strong>
                  <span>
                    Local delivery may be available after address and access confirmation.
                  </span>
                </div>
              </div>
              <TrackedLink
                className="text-link"
                event="directions_click"
                href={siteContent.directionsUrl}
              >
                Get directions to the store →
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
