import type { Metadata } from "next";
import { ContactForm } from "@/components/public/contact-form";
import { TrackedLink } from "@/components/public/tracked-link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Contact Afrodita Appliances",
  description:
    "Call, visit, get directions, or send a retail, repair, delivery, warranty, or property-manager inquiry.",
};
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main id="main-content">
      <section className="page-hero compact-hero">
        <div className="container narrow">
          <p className="eyebrow">We’re here to help</p>
          <h1>Contact Afrodita Appliances</h1>
          <p>
            Ask about inventory, reservations, repairs, delivery, warranty choices, or
            property-manager support.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container contact-layout">
          <div>
            <ContactForm initialReason={reason} />
          </div>
          <aside className="contact-details">
            <h2>Visit or call</h2>
            <p>
              <strong>{siteContent.address}</strong>
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
              className="button button-secondary"
              event="directions_click"
              href={siteContent.directionsUrl}
            >
              Get directions
            </TrackedLink>
            <p className="fine-print">
              Production email sending is disabled until approved provider credentials are
              configured.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
