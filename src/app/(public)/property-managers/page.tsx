import type { Metadata } from "next";
import Link from "next/link";
import { TrackedLink } from "@/components/public/tracked-link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Appliances for Property Managers",
  description:
    "Local appliance sourcing, replacement, delivery, warranty, repair, and portfolio support for property managers.",
};
export default function PropertyManagersPage() {
  const services = [
    ["Appliance sourcing", "Ask us to help locate practical options for units and common areas."],
    [
      "Replacements",
      "Coordinate a replacement when an existing appliance reaches the end of its useful life.",
    ],
    ["Delivery", "Plan delivery around property access and tenant communication."],
    [
      "Property-manager pricing",
      "Contact the team for approved account-specific pricing information.",
    ],
    ["Warranty options", "Explore currently approved coverage choices for qualifying appliances."],
    ["Repairs and service", "Route service requests and keep appliance history organized."],
    ["Portfolio support", "Use one local contact for properties, units, orders, and follow-up."],
    ["Dedicated portal", "Approved partners can securely access their company-scoped workspace."],
  ];
  return (
    <main id="main-content">
      <section className="pm-hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">For local rental portfolios</p>
            <h1>One local team for appliance sourcing and support</h1>
            <p>
              Coordinate replacements, delivery, warranty options, repairs, and service without
              mixing property-manager workflows into the retail shopping experience.
            </p>
            <div className="hero-actions">
              <TrackedLink
                className="button button-primary button-large"
                event="property_manager_inquiry_click"
                href="/contact?reason=property_manager"
              >
                Request Property Manager Access
              </TrackedLink>
              <Link className="button button-secondary button-large" href="/property-manager/login">
                Property Manager Login
              </Link>
            </div>
            <p>
              <strong>Prefer to talk?</strong> Call Steven through the Afrodita store at{" "}
              <a href={siteContent.phoneHref}>{siteContent.phone}</a>.
            </p>
          </div>
          <div className="pm-portal-art">
            <span aria-hidden="true">⌂</span>
            <strong>Portfolio-ready support</strong>
            <small>Properties · Units · Requests · Delivery</small>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="service-grid">
            {services.map(([title, copy]) => (
              <article className="service-card" key={title}>
                <span aria-hidden="true">♥</span>
                <h2>{title}</h2>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="center-actions">
            <TrackedLink
              className="button button-primary button-large"
              event="property_manager_inquiry_click"
              href="/contact?reason=property_manager"
            >
              Contact Afrodita
            </TrackedLink>
            <a className="button button-secondary button-large" href={siteContent.phoneHref}>
              Call Steven
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
