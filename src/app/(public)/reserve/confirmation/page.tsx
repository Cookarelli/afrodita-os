import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "Reservation Request Received",
  robots: { index: false, follow: false },
};
export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  if (!reference?.match(/^AFR-[A-Z0-9]{8}$/))
    return (
      <main id="main-content">
        <div className="container section">
          <div className="empty-state">
            <h1>Reservation reference not found</h1>
            <Link className="button button-primary" href="/shop">
              Return to shop
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <main id="main-content">
      <section className="section">
        <div className="container narrow">
          <div className="confirmation-card">
            <span className="confirmation-mark" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">Request received</p>
            <h1>We’ll check it and get in touch.</h1>
            <p>Your reservation request reference is:</p>
            <strong className="reference-number">{reference}</strong>
            <div className="notice">
              This request is not yet a confirmed hold or completed sale. Afrodita must confirm the
              appliance’s availability and readiness.
            </div>
            <p>
              Questions? Call <a href={siteContent.phoneHref}>{siteContent.phone}</a>.
            </p>
            <Link className="button button-secondary" href="/shop">
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
