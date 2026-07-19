import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Appliance Delivery",
  description: "Ask Afrodita Appliances about local delivery from the Loves Park store.",
};
export default function DeliveryPage() {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="container narrow">
          <p className="eyebrow">From our floor to your home</p>
          <h1>Local appliance delivery</h1>
          <p>{siteContent.delivery.summary}</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow prose">
          <h2>Before delivery is confirmed</h2>
          <p>
            We’ll ask about your address, stairs, entrances, connection needs, timing, and the
            appliance you selected. Availability, delivery area, scheduling, and any applicable
            charges must be confirmed by staff.
          </p>
          <h2>Preparing for delivery</h2>
          <ul>
            <li>Measure doorways, hallways, and the appliance space.</li>
            <li>Tell us about stairs or difficult access.</li>
            <li>Make sure an authorized adult can be present.</li>
            <li>Ask what connections or removal services are available.</li>
          </ul>
          <div className="button-row">
            <Link className="button button-primary" href="/shop">
              Shop appliances
            </Link>
            <Link className="button button-secondary" href="/contact?reason=delivery">
              Ask a delivery question
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
