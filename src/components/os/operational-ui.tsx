import type { ReactNode } from "react";

export function OperationalHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Operations</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function PageNotice({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  if (searchParams.error)
    return (
      <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {searchParams.error}
      </p>
    );
  if (searchParams.success)
    return (
      <p
        role="status"
        className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
      >
        {searchParams.success}
      </p>
    );
  return null;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-8 text-[var(--muted)]">
      {children}
    </div>
  );
}

export const controlClass = "min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 py-2";
export const primaryButtonClass =
  "min-h-11 rounded-lg bg-[var(--brand)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-strong)]";
