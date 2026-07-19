import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base?.startsWith("https://")) return [];
  const routes = [
    "",
    "/shop",
    "/warranty-club",
    "/repairs",
    "/delivery",
    "/property-managers",
    "/about",
    "/contact",
    "/reserve",
  ];
  return routes.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: route === "/shop" ? "daily" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
