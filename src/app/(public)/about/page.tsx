import type { Metadata } from "next";
import { siteContent } from "@/config/site";
export const metadata: Metadata = {
  title: "About Afrodita Appliances",
  description:
    "A local Loves Park appliance store focused on practical, affordable access to working appliances.",
};
export default function AboutPage() {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="container narrow">
          <p className="eyebrow">Appliances powered by love</p>
          <h1>A practical local appliance store</h1>
          <p>
            Afrodita Appliances helps local households and property managers find working appliance
            options with clear, human support.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow prose">
          <h2>Extending appliance life</h2>
          <p>
            Used and refurbished appliances can keep useful equipment working longer while making
            household essentials more accessible. We believe in repair before replacement when it
            makes sense.
          </p>
          <h2>Come talk with us</h2>
          <p>
            Visit {siteContent.address}, {siteContent.cityStateZip}, or call{" "}
            <a href={siteContent.phoneHref}>{siteContent.phone}</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
