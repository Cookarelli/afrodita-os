import { createClient } from "@supabase/supabase-js";
import { developmentAppliances } from "./dev-data";
import type { PublicAppliance } from "./types";

type PublicRow = Record<string, unknown>;

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function mapRow(row: PublicRow): PublicAppliance {
  const publicPhotoUrl = (path: string) =>
    `/api/public/appliance-photo?path=${encodeURIComponent(path)}`;
  const photos = Array.isArray(row.photos)
    ? (row.photos as Array<{ path: string; alt: string | null }>).map((photo) => ({
        ...photo,
        path: publicPhotoUrl(photo.path),
      }))
    : row.photo_path
      ? [
          {
            path: publicPhotoUrl(String(row.photo_path)),
            alt: (row.photo_alt as string | null) ?? null,
          },
        ]
      : [];
  return {
    publicId: String(row.public_id),
    inventoryNumber: String(row.inventory_number),
    category: String(row.category),
    brand: (row.brand as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    finish: (row.finish as string | null) ?? null,
    widthInches: row.width_inches == null ? null : Number(row.width_inches),
    fuelType: (row.fuel_type as string | null) ?? null,
    condition: (row.condition as string | null) ?? null,
    description: (row.public_description as string | null) ?? null,
    priceCents: row.public_price_cents == null ? null : Number(row.public_price_cents),
    currency: String(row.currency ?? "usd"),
    availableAt: (row.available_at as string | null) ?? null,
    photos,
  };
}

export async function listPublicAppliances(): Promise<PublicAppliance[]> {
  if (!configured()) return process.env.NODE_ENV === "development" ? developmentAppliances : [];
  const { data, error } = await client().rpc("list_public_appliances");
  if (error) throw new Error("Public inventory is temporarily unavailable.");
  return (data as PublicRow[]).map(mapRow);
}

export async function getPublicAppliance(publicId: string): Promise<PublicAppliance | null> {
  if (!configured())
    return developmentAppliances.find((item) => item.publicId === publicId) ?? null;
  const { data, error } = await client().rpc("get_public_appliance", {
    target_public_id: publicId,
  });
  if (error) throw new Error("Appliance details are temporarily unavailable.");
  const row = (data as PublicRow[])[0];
  return row ? mapRow(row) : null;
}
