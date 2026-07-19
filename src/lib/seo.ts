export function canonicalUrl(path: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base?.startsWith("https://")) return undefined;
  return new URL(path, base).toString();
}
