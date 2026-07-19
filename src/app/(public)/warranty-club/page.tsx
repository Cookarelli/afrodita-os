import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Warranty Club",
  description: "Learn how to ask Afrodita Appliances about currently available warranty choices.",
};
export default function WarrantyPage() {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="container narrow">
          <p className="eyebrow">Support after your purchase</p>
          <h1>Warranty Club</h1>
          <p>{siteContent.warranty.summary}</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow prose">
          <div className="notice">
            <strong>Details awaiting business approval</strong>
            <p>{siteContent.warranty.pendingDetails}</p>
          </div>
          <h2>What to ask our team</h2>
          <ul>
            <li>Whether your appliance qualifies</li>
            <li>What coverage and term options are currently approved</li>
            <li>How to request service if something goes wrong</li>
            <li>Any exclusions, fees, or responsibilities</li>
          </ul>
          <p>Final written terms provided by Afrodita govern any warranty or club enrollment.</p>
          <div className="button-row">
            <a className="button button-primary" href={siteContent.phoneHref}>
              Call to ask
            </a>
            <Link className="button button-secondary" href="/contact?reason=warranty">
              Send a question
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
