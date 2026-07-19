"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registerAppliancePhotoAction } from "@/lib/os/actions";

export function AppliancePhotoUploader({
  applianceId,
  organizationId,
}: {
  applianceId: string;
  organizationId: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="font-bold">Appliance photos</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Choose multiple JPG, PNG, or WebP photos. The first photo is the cover.
      </p>
      <input
        className="mt-3 block w-full text-sm"
        accept="image/jpeg,image/png,image/webp"
        multiple
        type="file"
        disabled={busy}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          if (!files.length) return;
          setBusy(true);
          setMessage(null);
          try {
            const supabase = createSupabaseBrowserClient();
            for (const file of files) {
              const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
              const path = `organization/${organizationId}/appliances/${applianceId}/${crypto.randomUUID()}.${extension}`;
              const { error } = await supabase.storage
                .from("appliance-photos")
                .upload(path, file, { contentType: file.type, upsert: false });
              if (error) throw error;
              const formData = new FormData();
              formData.set("applianceId", applianceId);
              formData.set("path", path);
              await registerAppliancePhotoAction(formData);
            }
            setMessage("Photos uploaded. Refresh to manage cover and order.");
          } catch {
            setMessage("Photos could not be uploaded. Please try again.");
          } finally {
            setBusy(false);
            event.target.value = "";
          }
        }}
      />
      {message ? (
        <p className="mt-3 text-sm" role="status">
          {message}
        </p>
      ) : null}
      {busy ? <p className="mt-3 text-sm">Uploading…</p> : null}
    </div>
  );
}
