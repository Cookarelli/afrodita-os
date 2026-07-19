import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <div className="mobile-action-bar">
        <a href="tel:+18152223679">Call</a>
        <Link href="/shop">Shop</Link>
        <Link href="/reserve">Reserve</Link>
      </div>
    </>
  );
}
