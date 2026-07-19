import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Appliance Repairs",
  description: "Contact Afrodita Appliances about appliance repair and service options.",
};
export default function RepairsPage() {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="container narrow">
          <p className="eyebrow">Repair before replacement</p>
          <h1>Practical appliance repair help</h1>
          <p>
            When repair makes sense, keeping a working appliance in service can save money and
            reduce unnecessary waste.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow prose">
          <h2>Start with a service inquiry</h2>
          <p>
            Tell us the appliance type, brand, symptoms, location, and whether it was purchased from
            Afrodita. The team will confirm whether service is available and explain the next step.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/contact?reason=repair">
              Request repair help
            </Link>
            <a className="button button-secondary" href={siteContent.phoneHref}>
              Call the store
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
