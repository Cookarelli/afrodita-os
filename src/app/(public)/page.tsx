import type { Metadata } from "next";
import Link from "next/link";
import { InventoryCard } from "@/components/public/inventory-card";
import { SectionHeading } from "@/components/public/section-heading";
import { TrackedLink } from "@/components/public/tracked-link";
import { siteContent } from "@/config/site";
import { listPublicAppliances } from "@/lib/public-inventory/repository";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Affordable Used Appliances in Loves Park",
  description:
    "Shop available used and refurbished appliances from Afrodita Appliances in Loves Park, Illinois. Reserve for pickup or ask about local delivery.",
  alternates: canonicalUrl("/") ? { canonical: canonicalUrl("/") } : undefined,
};

const categories = [
  ["Refrigerators", "refrigerator", "Keep everyday food fresh."],
  ["Washers", "washer", "Practical laundry options."],
  ["Dryers", "dryer", "Gas and electric choices."],
  ["Stoves & ranges", "range", "Cook with confidence."],
  ["Freezers", "freezer", "Make room for more."],
  ["Laundry centers", "laundry-center", "Space-saving pairs."],
  ["Miscellaneous", "miscellaneous", "More useful home appliances."],
] as const;

export default async function HomePage() {
  const inventory = (await listPublicAppliances()).slice(0, 3);
  return (
    <main id="main-content">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{siteContent.homepage.eyebrow}</p>
            <h1>{siteContent.homepage.headline}</h1>
            <p className="hero-lead">{siteContent.homepage.supportingCopy}</p>
            <ul className="hero-checks">
              <li>Tested inventory</li>
              <li>Pickup or local delivery</li>
              <li>Warranty options available</li>
            </ul>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/shop">
                Shop Available Appliances
              </Link>
              <TrackedLink
                className="button button-secondary button-large"
                event="phone_click"
                href={siteContent.phoneHref}
              >
                Call Now
              </TrackedLink>
              <TrackedLink
                className="text-link"
                event="directions_click"
                href={siteContent.directionsUrl}
              >
                Get Directions →
              </TrackedLink>
            </div>
            <Link className="pm-inline-link" href="/property-managers">
              Property Manager Services
            </Link>
          </div>
          <div className="hero-art" aria-label="A welcoming appliance showroom illustration">
            <div className="appliance-shape fridge-shape">
              <span>♡</span>
            </div>
            <div className="appliance-shape washer-shape">
              <span>●</span>
            </div>
            <div className="hero-note">
              <strong>Reserve before you visit</strong>
              <span>We’ll confirm availability and readiness.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-title-row">
            <SectionHeading eyebrow="Fresh on the floor" title="Available now">
              <p>
                Newly available development inventory, loaded from the public-safe inventory source.
              </p>
            </SectionHeading>
            <Link className="text-link desktop-only" href="/shop">
              See all appliances →
            </Link>
          </div>
          {inventory.length ? (
            <div className="inventory-grid">
              {inventory.map((item) => (
                <InventoryCard appliance={item} key={item.publicId} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Inventory is being updated</h3>
              <p>Call the store to ask what is currently available.</p>
              <a className="button button-primary" href={siteContent.phoneHref}>
                Call {siteContent.phone}
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <SectionHeading eyebrow="Find your fit" title="Shop by category" align="center">
            <p>Start with the appliance your home needs.</p>
          </SectionHeading>
          <div className="category-grid">
            {categories.map(([label, value, copy]) => (
              <Link className="category-card" href={`/shop?category=${value}`} key={value}>
                <span className="category-icon" aria-hidden="true">
                  ♡
                </span>
                <h3>{label}</h3>
                <p>{copy}</p>
                <span>Browse →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Local help, clear choices"
            title="Why choose Afrodita"
            align="center"
          />
          <div className="benefit-grid">
            {[
              [
                "Tested appliances",
                "Our inventory is prepared for sale before it appears as available.",
              ],
              [
                "Affordable local options",
                "Explore used and refurbished choices without a complicated buying process.",
              ],
              [
                "Delivery available",
                "Ask about local delivery based on your address and schedule.",
              ],
              ["Warranty choices", "Our team can explain currently approved warranty options."],
              ["Helpful local staff", "Call or stop in when you want a real person to help."],
              [
                "Property-manager support",
                "Coordinate sourcing, replacements, delivery, and service.",
              ],
            ].map(([title, copy]) => (
              <article className="benefit-card" key={title}>
                <span aria-hidden="true">♥</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section reservation-steps">
        <div className="container">
          <SectionHeading
            eyebrow="A simple hold request"
            title="How reservations work"
            align="center"
          />
          <ol>
            {[
              ["Browse", "Choose an appliance marked available."],
              ["Request", "Share your pickup or delivery preference."],
              ["Confirm", "Afrodita checks availability and readiness."],
              ["Arrange", "Coordinate pickup or delivery with the team."],
              ["Complete", "Complete payment only after confirmation."],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <div className="notice">
            Submitting a reservation request does not guarantee a sale. An Afrodita team member must
            confirm availability and readiness.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-callouts">
          <article className="feature-callout warranty-callout">
            <p className="eyebrow">Support after the sale</p>
            <h2>{siteContent.warranty.heading}</h2>
            <p>{siteContent.warranty.summary}</p>
            <Link className="button button-light" href="/warranty-club">
              Explore Warranty Club
            </Link>
          </article>
          <article className="feature-callout pm-callout">
            <p className="eyebrow">For your portfolio</p>
            <h2>{siteContent.propertyManagers.heading}</h2>
            <p>{siteContent.propertyManagers.summary}</p>
            <Link className="button button-light" href="/property-managers">
              Property Manager Services
            </Link>
          </article>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <SectionHeading eyebrow="Customer experiences" title="Reviews" align="center" />
          <div className="review-placeholder">
            <span aria-hidden="true">“</span>
            <h3>Verified reviews are being prepared</h3>
            <p>
              Approved customer reviews have not been imported into this preview. No placeholder
              testimonial is being presented as a real review.
            </p>
            <small>Development placeholder</small>
          </div>
        </div>
      </section>

      <section className="section visit-section">
        <div className="container visit-grid">
          <div>
            <p className="eyebrow">Come see what’s available</p>
            <h2>Visit Afrodita Appliances</h2>
            <p className="visit-address">
              {siteContent.address}
              <br />
              {siteContent.cityStateZip}
            </p>
            <p>
              <a href={siteContent.phoneHref}>{siteContent.phone}</a>
              <br />
              <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a>
            </p>
            <div className="hours-list">
              {siteContent.hours.map((item) => (
                <div key={item.label}>
                  <strong>{item.label}</strong>
                  <span>{item.hours}</span>
                </div>
              ))}
            </div>
            <TrackedLink
              className="button button-primary button-large"
              event="directions_click"
              href={siteContent.directionsUrl}
            >
              Get Directions
            </TrackedLink>
          </div>
          <div className="map-card">
            <div className="map-pin" aria-hidden="true">
              ♥
            </div>
            <strong>Loves Park, Illinois</strong>
            <span>On North 2nd Street</span>
            <TrackedLink event="directions_click" href={siteContent.directionsUrl}>
              Open in Google Maps →
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
