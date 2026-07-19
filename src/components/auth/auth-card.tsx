import type { ReactNode } from "react";

export function AuthCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <p className="font-semibold text-[var(--brand)]">Afrodita OS</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-3 leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

export const fieldClassName =
  "mt-2 min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 focus:border-[var(--brand)] focus:outline-none";

export const submitClassName =
  "mt-5 min-h-11 w-full rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white hover:bg-[var(--brand-strong)] focus:outline focus:outline-2";
