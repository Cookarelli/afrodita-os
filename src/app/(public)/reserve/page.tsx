import type { Metadata } from "next";
import { ReservationForm } from "@/components/public/reservation-form";
import { listPublicAppliances } from "@/lib/public-inventory/repository";
export const metadata: Metadata = {
  title: "Reserve an Appliance",
  description:
    "Request a temporary reservation on an available appliance before visiting Afrodita Appliances.",
};
export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ appliance?: string }>;
}) {
  const [{ appliance }, appliances] = await Promise.all([searchParams, listPublicAppliances()]);
  return (
    <main id="main-content">
      <section className="page-hero compact-hero">
        <div className="container narrow">
          <p className="eyebrow">Reserve before you visit</p>
          <h1>Request an appliance reservation</h1>
          <p>
            Choose an available appliance and tell us how you would like to receive it. We’ll
            confirm availability and readiness.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container form-container">
          <ReservationForm appliances={appliances} selectedId={appliance} />
          <aside className="form-aside">
            <h2>What happens next</h2>
            <ol>
              <li>We review the appliance and your request.</li>
              <li>A team member confirms availability.</li>
              <li>We coordinate pickup or delivery.</li>
              <li>Payment happens after confirmation.</li>
            </ol>
            <div className="notice">
              Requests expire if they are not confirmed within the configured reservation window.
              Staff can extend an active request when appropriate.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
