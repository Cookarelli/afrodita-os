import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
};

export function ButtonLink({ children, href, variant = "primary" }: ButtonLinkProps) {
  const color =
    variant === "primary"
      ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]"
      : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--brand)]";

  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 font-semibold transition-colors ${color}`}
      href={href}
    >
      {children}
    </Link>
  );
}
