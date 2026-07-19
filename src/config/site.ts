export interface StoreHours {
  label: string;
  hours: string;
}

export interface SiteContent {
  brand: string;
  company: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  cityStateZip: string;
  directionsUrl: string;
  hours: StoreHours[];
  homepage: { eyebrow: string; headline: string; supportingCopy: string };
  warranty: { heading: string; summary: string; pendingDetails: string };
  delivery: { heading: string; summary: string };
  propertyManagers: { heading: string; summary: string };
  socialLinks: Array<{ label: string; href: string }>;
  promotionalBanner: string | null;
  temporaryNotice: string | null;
}

export const siteContent: SiteContent = {
  brand: "Afrodita Appliances",
  company: "Afrodita White Goods LLC",
  phone: "815-222-3679",
  phoneHref: "tel:+18152223679",
  email: "AfroditaAppliances@gmail.com",
  address: "5205 N. 2nd St.",
  cityStateZip: "Loves Park, IL 61111",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=5205+N+2nd+St+Loves+Park+IL+61111",
  hours: [
    { label: "Monday–Saturday", hours: "11:00 AM–8:00 PM" },
    { label: "Sunday", hours: "11:00 AM–5:00 PM" },
  ],
  homepage: {
    eyebrow: "Local appliances. Practical prices.",
    headline: "Affordable appliances, powered by love.",
    supportingCopy:
      "Shop tested used and refurbished appliances for pickup or local delivery. Reserve an available appliance before you visit and ask our team about warranty options.",
  },
  warranty: {
    heading: "Extra confidence with Warranty Club",
    summary:
      "Ask our team about available warranty choices for qualifying appliances and ongoing support after your purchase.",
    pendingDetails:
      "Plan availability, coverage, pricing, exclusions, and final terms are being confirmed. Contact the store for current approved details.",
  },
  delivery: {
    heading: "Need help getting it home?",
    summary:
      "Local delivery may be available based on the appliance, address, schedule, and access requirements. We confirm details before payment.",
  },
  propertyManagers: {
    heading: "Appliance support for property managers",
    summary:
      "Source replacements, coordinate delivery, explore warranty options, and request service through one local team.",
  },
  socialLinks: [],
  promotionalBanner: null,
  temporaryNotice: null,
};

export const navItems = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Warranty Club", "/warranty-club"],
  ["Repairs", "/repairs"],
  ["Delivery", "/delivery"],
  ["Property Managers", "/property-managers"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;
