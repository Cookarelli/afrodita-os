import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="font-semibold text-[var(--brand)]">Project documentation</p>
      <h1 className="mt-2 text-4xl font-bold">Architecture before implementation</h1>
      <p className="mt-5 leading-7 text-[var(--muted)]">
        The source of truth is the versioned Markdown in the repository&apos;s docs directory. It
        covers the current-system audit, migration gates, permissions, and proposed data model.
      </p>
      <Link className="mt-8 inline-block font-semibold text-[var(--brand)] underline" href="/">
        Return to foundation overview
      </Link>
    </main>
  );
}
