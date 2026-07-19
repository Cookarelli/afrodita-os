import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Afrodita Appliances", template: "%s | Afrodita Appliances" },
  description: "Affordable used and refurbished appliances in Loves Park, Illinois.",
  openGraph: { type: "website", siteName: "Afrodita Appliances", locale: "en_US" },
  robots: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Afrodita Appliances",
    legalName: "Afrodita White Goods LLC",
    telephone: "+1-815-222-3679",
    email: "AfroditaAppliances@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5205 N. 2nd St.",
      addressLocality: "Loves Park",
      addressRegion: "IL",
      postalCode: "61111",
      addressCountry: "US",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "11:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "11:00",
        closes: "17:00",
      },
    ],
  };
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
        />
        {children}
      </body>
    </html>
  );
}
