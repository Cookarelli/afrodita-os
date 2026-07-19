import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base?.startsWith("https://")) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/os/", "/property-manager/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
