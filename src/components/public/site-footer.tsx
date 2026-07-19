import Link from "next/link";
import { navItems, siteContent } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">Afrodita Appliances</div>
          <p>Affordable access to working appliances, with local help when you need it.</p>
        </div>
        <div>
          <h2>Visit</h2>
          <p>
            {siteContent.address}
            <br />
            {siteContent.cityStateZip}
          </p>
          {siteContent.hours.map((item) => (
            <p key={item.label}>
              <strong>{item.label}</strong>
              <br />
              {item.hours}
            </p>
          ))}
        </div>
        <div>
          <h2>Explore</h2>
          {navItems.slice(1).map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Contact</h2>
          <a href={siteContent.phoneHref}>{siteContent.phone}</a>
          <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a>
          <Link href="/staff/login">Staff Login</Link>
          <Link href="/property-manager/login">Property Manager Login</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} {siteContent.company}. Repair before replacement when it makes
        sense.
      </div>
    </footer>
  );
}
