import { requirePermission } from "@/lib/auth/session";
import type { Permission } from "@/lib/roles";

export async function ProtectedModule({
  description,
  permission,
  title,
}: {
  description: string;
  permission: Permission;
  title: string;
}) {
  await requirePermission(permission);

  return (
    <section aria-labelledby="module-title">
      <p className="font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
        Secure module shell
      </p>
      <h1 className="mt-2 text-3xl font-bold" id="module-title">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-white p-6">
        This phase establishes authentication and authorization only. Module workflows arrive in a
        later prompt.
      </div>
    </section>
  );
}
